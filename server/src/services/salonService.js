import crypto from "crypto";
import Salon from "../models/Salon.js";
import SalonReview from "../models/SalonReview.js";
import CreditTransaction from "../models/CreditTransaction.js";
import CreditPlan from "../models/CreditPlan.js";
import { BASE_SCAN_COSTS, scanCosts } from "./credits.js";
import { usdInrRate } from "./razorpay.js";

const slugify = (s) =>
  String(s || "salon")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "salon";

export const uniqueSlug = async (name) => {
  const base = slugify(name);
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${crypto.randomBytes(2).toString("hex")}`;
    if (!(await Salon.exists({ slug }))) return slug;
  }
  return `${base}-${crypto.randomBytes(4).toString("hex")}`;
};

export const createSalonFor = async (user, name) =>
  Salon.create({ owner: user._id, name, slug: await uniqueSlug(name), email: user.email, phone: user.phone });

// A salon is "set up" once the basics a customer needs to find it are filled in.
export const isProfileComplete = (s) =>
  Boolean(s.name && s.phone && s.address?.line1 && s.address?.city && Number.isFinite(s.location?.lat) && Number.isFinite(s.location?.lng));

// Unlocked once the owner has credits or has bought a plan — or while the admin
// has any scan switched free, since nothing needs buying then.
export const hasPurchasedPlan = async (user) =>
  (user.credits ?? 0) > 0 ||
  Object.values(scanCosts()).some((c) => c === 0) || Boolean(await CreditTransaction.exists({ user: user._id, type: "purchase", paymentStatus: "paid" }));

/**
 * What a scan costs the salon on each credit plan, in paise: the scan's credit
 * cost × the plan's price per credit. Shown before the salon buys a plan.
 */
export const planScanPricing = async () => {
  const plans = await CreditPlan.find({ archived: false }).sort({ priceUsd: 1, credits: 1 });
  const costs = scanCosts();
  return {
    costs,
    listCosts: BASE_SCAN_COSTS,
    plans: plans.map((p) => {
      const rupees = p.priceInr ?? Math.round(p.priceUsd * usdInrRate());
      const perCreditPaise = (rupees * 100) / p.credits;
      const per = (mode) => Math.round(costs[mode] * perCreditPaise);
      return {
        id: p.code,
        name: p.name,
        credits: p.credits,
        pricePaise: rupees * 100,
        popular: p.popular,
        bestValue: p.bestValue,
        perCreditPaise: Math.round(perCreditPaise * 100) / 100,
        scanPaise: { quick: per("quick"), focus: per("focus"), detailed: per("detailed") },
      };
    }),
  };
};

export const recalcRating = async (salonId) => {
  const [agg] = await SalonReview.aggregate([
    { $match: { salon: salonId } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  await Salon.updateOne(
    { _id: salonId },
    { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.n || 0 }
  );
};

// Profile fields an owner (or admin) may set, with light cleaning.
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const num = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));

export const applyProfile = (salon, body) => {
  const set = (key, val) => val !== undefined && (salon[key] = val);
  set("name", str(body.name, 80) || undefined);
  set("tagline", str(body.tagline, 140));
  set("description", str(body.description, 2000));
  set("logoUrl", str(body.logoUrl, 300));
  set("coverUrl", str(body.coverUrl, 300));
  set("phone", str(body.phone, 30));
  set("email", str(body.email, 120)?.toLowerCase());
  set("website", str(body.website, 200));
  set("gstin", str(body.gstin, 20)?.toUpperCase());
  if (body.address && typeof body.address === "object") {
    for (const k of ["line1", "line2", "city", "state", "postalCode", "country"]) {
      const v = str(body.address[k], 120);
      if (v !== undefined) salon.set(`address.${k}`, v);
    }
  }
  if (body.location && typeof body.location === "object") {
    const lat = num(body.location.lat);
    const lng = num(body.location.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      salon.set("location", { lat, lng });
    }
  }
  if (Array.isArray(body.services)) {
    salon.services = [...new Set(body.services.map((s) => str(s, 50)).filter(Boolean))].slice(0, 30);
  }
  if (Array.isArray(body.hours)) {
    salon.hours = body.hours.slice(0, 7).map((h) => ({
      day: str(h.day, 12),
      open: str(h.open, 5),
      close: str(h.close, 5),
      closed: Boolean(h.closed),
    }));
  }
  salon.profileComplete = isProfileComplete(salon);
};

export const toPaise = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 100000000 ? n : null;
};

const toRad = (d) => (d * Math.PI) / 180;
export const distanceKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
};

// What the public site may see of a salon (never the owner's account details).
export const publicSalon = (s, from) => {
  const o = s.toObject ? s.toObject() : s;
  const view = {
    id: o._id,
    slug: o.slug,
    name: o.name,
    tagline: o.tagline,
    description: o.description,
    logoUrl: o.logoUrl,
    coverUrl: o.coverUrl,
    phone: o.phone,
    website: o.website,
    address: o.address,
    location: o.location,
    services: o.services,
    hours: o.hours,
    scanPrices: o.scanPrices,
    featured: o.featured,
    ratingAvg: o.ratingAvg,
    ratingCount: o.ratingCount,
  };
  if (from && Number.isFinite(o.location?.lat)) view.distanceKm = distanceKm(from, o.location);
  return view;
};
