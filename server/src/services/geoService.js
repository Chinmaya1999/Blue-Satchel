/**
 * Location services built on free, keyless OpenStreetMap APIs:
 *  - Nominatim  — reverse geocoding (lat/lng -> city) and bounded place search
 *  - Overpass   — tag-based search for doctors/clinics around a point
 *  - ipwho.is   — approximate location from an IP when the user denies GPS
 *
 * Nominatim's usage policy allows at most 1 request/second with an
 * identifying User-Agent, so every Nominatim call goes through one queue,
 * and dermatologist results are cached per ~1 km cell.
 */

const USER_AGENT = `BlueSatchel/1.0 (${process.env.CLIENT_URL || "https://bluesatchel.online"})`;
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const REQUEST_TIMEOUT_MS = 12000;

const getJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...options.headers },
    signal: AbortSignal.timeout(options.timeout || REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
};

// Serialises Nominatim calls at >= 1.1 s apart.
let nominatimQueue = Promise.resolve();
const nominatim = (path) => {
  const run = nominatimQueue.then(() => getJson(`${NOMINATIM}${path}`));
  nominatimQueue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 1100)));
  return run;
};

const isValidCoord = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Great-circle distance in km.
export const distanceKm = (aLat, aLng, bLat, bLng) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

export const reverseGeocode = async (lat, lng) => {
  const d = await nominatim(`/reverse?format=jsonv2&zoom=14&addressdetails=1&lat=${lat}&lon=${lng}`);
  const a = d.address || {};
  return {
    city: a.city || a.town || a.village || a.suburb || a.county || a.state_district,
    region: a.state,
    country: a.country,
    displayName: d.display_name,
  };
};

// Client IP behind the nginx proxy (see deploy/nginx/site.conf).
export const clientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  return (forwarded || req.headers["x-real-ip"] || req.socket?.remoteAddress || "").replace(/^::ffff:/, "");
};

const isPrivateIp = (ip) =>
  !ip || ip === "::1" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd|fe80)/i.test(ip);

const locateIp = async (ip) => {
  if (isPrivateIp(ip)) return null;
  const d = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!d.success) return null;
  return { lat: d.latitude, lng: d.longitude, city: d.city, region: d.region, country: d.country };
};

/**
 * Builds the signup location for a new user: the browser's GPS fix when the
 * user allowed it, otherwise an approximate location from their IP. Never
 * throws — signup must not fail because a free geo API is down.
 */
export const resolveSignupLocation = async (req, gps) => {
  const ip = clientIp(req);
  try {
    const lat = Number(gps?.lat);
    const lng = Number(gps?.lng);
    if (isValidCoord(lat, lng)) {
      const place = await reverseGeocode(lat, lng).catch(() => ({}));
      const accuracy = Number(gps.accuracy);
      return { lat, lng, accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : undefined, source: "gps", ip, ...place };
    }
    const approx = await locateIp(ip);
    if (approx) return { ...approx, source: "ip", ip, displayName: [approx.city, approx.region, approx.country].filter(Boolean).join(", ") };
  } catch (err) {
    console.error("[geo] signup location lookup failed:", err.message);
  }
  return ip ? { ip } : undefined;
};

// ---------------------------------------------------------------------------
// Nearby dermatologists
// ---------------------------------------------------------------------------

const SKIN_PATTERN = /derma|skin|cosmet|laser|aesthetic|hair\s*(&|and)\s*skin|cutis|twak/i;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map(); // "lat,lng" rounded to ~1 km -> { at, result }

const toPlace = ({ id, name, lat, lng, tags = {}, address, origin }) => ({
  id,
  name,
  lat,
  lng,
  speciality: tags["healthcare:speciality"] || null,
  address:
    address ||
    [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"], tags["addr:postcode"]]
      .filter(Boolean)
      .join(", ") ||
    null,
  phone: tags.phone || tags["contact:phone"] || null,
  website: tags.website || tags["contact:website"] || null,
  openingHours: tags.opening_hours || null,
  osmUrl: id ? `https://www.openstreetmap.org/${id}` : null,
  origin,
});

const overpassSearch = async (lat, lng, radiusM) => {
  const around = `(around:${radiusM},${lat},${lng})`;
  // Tag-indexed filters only — regex on names across a radius times out.
  const query = `[out:json][timeout:20];(
    nwr["healthcare:speciality"~"dermatology"]${around};
    nwr["amenity"~"^(doctors|clinic)$"]${around};
    nwr["healthcare"~"^(doctor|clinic)$"]${around};
  );out center tags;`;
  const d = await getJson(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    timeout: 25000,
  });
  return d.elements
    .filter((e) => e.tags?.name && (SKIN_PATTERN.test(e.tags.name) || /dermatology/.test(e.tags["healthcare:speciality"] || "")))
    .map((e) =>
      toPlace({
        id: `${e.type}/${e.id}`,
        name: e.tags.name,
        lat: e.lat ?? e.center?.lat,
        lng: e.lon ?? e.center?.lon,
        tags: e.tags,
        origin: "overpass",
      })
    );
};

const nominatimSearch = async (lat, lng, radiusKm) => {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((n) => n.toFixed(4)).join(",");
  const places = [];
  for (const term of ["skin clinic", "dermatologist", "skin care clinic", "dermatology"]) {
    const rows = await nominatim(
      `/search?format=jsonv2&extratags=1&limit=15&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(term)}`
    ).catch(() => []);
    for (const r of rows) {
      if (!r.name || !["amenity", "healthcare", "office", "shop"].includes(r.category)) continue;
      places.push(
        toPlace({
          id: `${r.osm_type}/${r.osm_id}`,
          name: r.name,
          lat: Number(r.lat),
          lng: Number(r.lon),
          tags: r.extratags || {},
          address: r.display_name.split(", ").slice(1, 5).join(", "),
          origin: "nominatim",
        })
      );
    }
  }
  return places;
};

/**
 * Skin / dermatology clinics near a point, nearest first. Tries Overpass,
 * falls back to Nominatim search (Overpass's public server is often
 * overloaded), and widens the radius once if nothing is close.
 */
export const findDermatologists = async (lat, lng, { limit = 10 } = {}) => {
  if (!isValidCoord(lat, lng)) throw Object.assign(new Error("Invalid coordinates."), { status: 400 });

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  let places = [];
  let radiusKm = 15;
  for (radiusKm of [15, 40]) {
    const found = await overpassSearch(lat, lng, radiusKm * 1000).catch((err) => {
      console.error("[geo] Overpass failed, using Nominatim:", err.message);
      return null;
    });
    places = found?.length ? found : await nominatimSearch(lat, lng, radiusKm);
    if (places.length) break;
  }

  const unique = [...new Map(places.map((p) => [p.id, p])).values()]
    .filter((p) => isValidCoord(p.lat, p.lng))
    .map((p) => ({ ...p, distanceKm: Math.round(distanceKm(lat, lng, p.lat, p.lng) * 10) / 10 }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  const result = { places: unique, radiusKm };
  // Don't cache an empty answer — it may just mean both APIs were down.
  if (unique.length) cache.set(key, { at: Date.now(), result });
  return result;
};
