import Product from "../models/Product.js";
import { KOREAN_BRANDS } from "./kbeauty.js";

// Product tags behind each scan concern key.
const KEY_TAGS = {
  spots: ["spots", "brightening"],
  pores: ["pores"],
  texture: ["texture"],
  redness: ["redness"],
  "dark-circles": ["dark-circles"],
  wrinkles: ["wrinkles"],
  acne: ["acne"],
  oiliness: ["oiliness"],
  moisture: ["hydration"],
  firmness: ["firmness"],
  radiance: ["brightening"],
  "eye-bags": ["eye-bags"],
  "droopy-upper-eyelid": ["firmness"],
  "droopy-lower-eyelid": ["firmness", "eye-bags"],
  "tear-trough": ["eye-bags", "dark-circles"],
};
const ORDER = ["cleanser", "toner", "treatment", "serum", "eye-care", "moisturizer", "sunscreen", "mask"];
const STEP = { cleanser: "Cleanse", toner: "Prep", treatment: "Spot treat", serum: "Serum", "eye-care": "Eyes", moisturizer: "Moisturize", sunscreen: "Protect (AM)", mask: "Mask" };

/**
 * Korean-brand products from the catalogue that fit the customer's goals.
 * Everything is returned in routine order; a product with no goal match is
 * only kept when it's a gentle essential (cleanser or moisturizer).
 */
export const koreanPicks = async (scan, goals, skinType) => {
  const catalogue = await Product.find({ isActive: true, stock: { $gt: 0 }, brand: { $in: KOREAN_BRANDS } });
  const weight = new Map();
  for (const g of goals) {
    const sev = scan.concerns.find((c) => c.key === g)?.severity ?? 50;
    for (const tag of KEY_TAGS[g] || []) weight.set(tag, Math.max(weight.get(tag) || 0, sev));
  }

  const scored = catalogue
    .filter((p) => !skinType || skinType === "unknown" || !p.skinTypes?.length || p.skinTypes.includes(skinType))
    .map((p) => {
      const matched = p.tags.filter((t) => weight.has(t));
      return { p, matched, score: matched.reduce((sum, t) => sum + weight.get(t), 0) };
    });

  // One best product per category (two serums allowed), keeping goal matches
  // and the two gentle essentials.
  const picked = [];
  for (const cat of ORDER) {
    const inCat = scored.filter((x) => x.p.category === cat).sort((a, b) => b.score - a.score || b.p.rating - a.p.rating);
    const take = cat === "serum" ? 2 : 1;
    for (const x of inCat.slice(0, take)) {
      if (x.score > 0 || ["cleanser", "moisturizer"].includes(cat)) picked.push(x);
    }
  }

  const products = picked.map(({ p, matched }, i) => ({
    _id: p._id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    imageUrl: p.imageUrl,
    stock: p.stock,
    stepLabel: `${i + 1} · ${STEP[p.category] || p.category}`,
    reason: matched.length ? `Targets ${matched.map((t) => t.replace("-", " ")).join(", ")}` : "Gentle daily essential",
  }));
  return { products, total: products.reduce((s, p) => s + p.price, 0) };
};
