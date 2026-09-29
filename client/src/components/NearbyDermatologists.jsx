import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, Phone, Globe, Loader2, LocateFixed, Stethoscope } from "lucide-react";
import api from "../api/axios.js";
import OsmMap, { esc } from "./OsmMap.jsx";
import { getBrowserLocation, directionsUrl, formatPlace } from "../utils/geo.js";

/**
 * Skin / dermatology clinics near the user, from OpenStreetMap.
 * Uses the browser's location when the user allows it; otherwise (or for
 * admins viewing someone else's report) the account's signup location.
 */
const NearbyDermatologists = ({ fallbackLocation, useFallbackOnly = false }) => {
  const [status, setStatus] = useState("idle"); // idle | locating | loading | done | error
  const [origin, setOrigin] = useState(null);
  const [places, setPlaces] = useState([]);
  const [radiusKm, setRadiusKm] = useState(null);
  const [note, setNote] = useState("");

  const fallback = Number.isFinite(fallbackLocation?.lat) ? fallbackLocation : null;

  const search = async (point, label) => {
    setOrigin({ ...point, label });
    setStatus("loading");
    try {
      const { data } = await api.get("/scans/dermatologists", { params: { lat: point.lat, lng: point.lng } });
      setPlaces(data.places);
      setRadiusKm(data.radiusKm);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const useMyLocation = async () => {
    setNote("");
    setStatus("locating");
    const gps = await getBrowserLocation();
    if (gps) return search(gps, "Your location");
    if (fallback) {
      setNote(`Location access is off, so we used your signup location (${formatPlace(fallback)}).`);
      return search(fallback, "Signup location");
    }
    setNote("Please allow location access in your browser to find clinics near you.");
    setStatus("idle");
  };

  useEffect(() => {
    if (useFallbackOnly) {
      if (fallback) search(fallback, "Signup location");
      return;
    }
    // Locate straight away; the browser shows its permission prompt the first
    // time, and falls back to the signup location if the user declines.
    useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markers = useMemo(
    () => [
      ...(origin ? [{ lat: origin.lat, lng: origin.lng, primary: true, popup: `<b>${esc(origin.label)}</b>` }] : []),
      ...places.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        popup: `<b>${esc(p.name)}</b><br/>${esc(p.distanceKm)} km away${p.address ? `<br/>${esc(p.address)}` : ""}`,
      })),
    ],
    [origin, places]
  );

  return (
    <section className="container-app pb-16">
      <div className="card rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fs-eyebrow">Expert care</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Dermatologists <span className="fs-gradient-text">near {useFallbackOnly ? "this user" : "you"}</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              This scan isn't a medical diagnosis. For persistent acne, sudden changes in spots or moles, or anything that
              worries you, see a dermatologist in person.
            </p>
          </div>
          {!useFallbackOnly && (
            <button onClick={useMyLocation} disabled={status === "locating" || status === "loading"} className="btn-secondary rounded-full disabled:opacity-60">
              {status === "locating" || status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
              {origin ? "Refresh" : "Find clinics near me"}
            </button>
          )}
        </div>

        {note && <p className="mt-4 text-sm text-amber-200/90">{note}</p>}

        {status === "idle" && !origin && !note && (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <MapPin size={15} className="text-cyan-300" />
            {useFallbackOnly ? "This user has no saved location." : "Share your location to see skin clinics nearby."}
          </p>
        )}
        {(status === "locating" || status === "loading") && (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={15} className="animate-spin text-cyan-300" />
            {status === "locating" ? "Getting your location…" : "Searching OpenStreetMap for skin clinics…"}
          </p>
        )}
        {status === "error" && <p className="mt-6 text-sm text-rose-300">Couldn't load nearby clinics right now. Please try again in a minute.</p>}

        {status === "done" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <OsmMap markers={markers} className="h-80 lg:h-full lg:min-h-[22rem]" />
            <div>
              {places.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No skin clinics are listed on OpenStreetMap within {radiusKm} km. Try searching "dermatologist near me" in your maps app.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    {places.length} found within {radiusKm} km of {origin?.label.toLowerCase()} · data © OpenStreetMap
                  </p>
                  <ul className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                    {places.map((p) => (
                      <li key={p.id} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex items-center gap-2 font-semibold text-white">
                            <Stethoscope size={15} className="shrink-0 text-cyan-300" /> {p.name}
                          </p>
                          <span className="shrink-0 font-mono text-xs text-cyan-200">{p.distanceKm} km</span>
                        </div>
                        {p.address && <p className="mt-1 text-xs text-slate-400">{p.address}</p>}
                        {p.openingHours && <p className="mt-1 text-xs text-slate-500">Hours: {p.openingHours}</p>}
                        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                          <a href={directionsUrl(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                            <Navigation size={13} /> Directions
                          </a>
                          {p.phone && (
                            <a href={`tel:${p.phone.split(";")[0]}`} className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
                              <Phone size={13} /> {p.phone.split(";")[0]}
                            </a>
                          )}
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
                              <Globe size={13} /> Website
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default NearbyDermatologists;
