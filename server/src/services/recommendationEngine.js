import Product from "../models/Product.js";

/**
 * Recommendation Service (Section 5.2 "Recommendation Services")
 * Builds a personalised routine from the AI diagnostic report: every concern
 * the scan scores (all 15 from Perfect Corp, or the 5 from the mock provider)
 * is mapped onto product tags, and each routine step picks the product whose
 * tags best cover the user's most severe concerns. Core steps (cleanser,
 * serums, moisturizer, sunscreen) are always filled; the others are only
 * added when a concern that needs them is significant enough.
 */

// Which product tags address each concern key the diagnostics service emits.
export const CONCERN_TO_TAGS = {
  spots: ["spots"],
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

const EYE_CONCERNS = ["dark-circles", "eye-bags", "droopy-upper-eyelid", "droopy-lower-eyelid", "tear-trough"];

// Routine in application order. Steps with `when` are only included when one
// of those concerns reaches `min` severity.
const ROUTINE = [
  { category: "cleanser" },
  { category: "toner", when: ["texture", "pores", "acne", "oiliness", "radiance"], min: 35 },
  { category: "treatment", when: ["acne", "spots", "wrinkles", "firmness", "redness"], min: 35 },
  { category: "serum", count: 2 },
  { category: "eye-care", when: EYE_CONCERNS, min: 20 },
  { category: "moisturizer" },
  { category: "sunscreen" },
];

// Severity at or below this is healthy skin and earns a product no credit.
// Scores in the low 20s are common on good skin; without a floor, many of
// those would add up and outvote the one concern that actually stands out.
const SEVERITY_FLOOR = 20;

// Each earlier pick that already covers a tag cuts the credit later picks get
// for it, so the routine spreads across concerns instead of stacking one.
const COVERED_DISCOUNT = 0.3;

const tagSeverities = (concerns) => {
  const out = {};
  for (const c of concerns) {
    for (const tag of CONCERN_TO_TAGS[c.key] || []) {
      out[tag] = Math.max(out[tag] || 0, c.severity);
    }
  }
  return out;
};

const suitsSkinType = (product, skinType) =>
  !skinType || skinType === "unknown" || !product.skinTypes?.length || product.skinTypes.includes(skinType);

// "Niacinamide 10%" -> "niacinamide". Used to avoid doubling up on the same
// active (two niacinamide serums, a BHA cleanser plus a BHA toner).
const primaryActive = (product) => (product.ingredients?.[0] || "").replace(/[\d.%]+/g, "").trim().toLowerCase();

const scoreProduct = (product, severities, covered) =>
  product.tags.reduce((sum, tag) => {
    const excess = Math.max(0, (severities[tag] || 0) - SEVERITY_FLOOR);
    // Squared so the most prominent concerns dominate the ranking.
    return sum + excess * excess * COVERED_DISCOUNT ** (covered.get(tag) || 0);
  }, 0);

export const recommendProducts = async (concerns, { skinType, limit } = {}) => {
  const severities = tagSeverities(concerns);
  const severityOf = Object.fromEntries(concerns.map((c) => [c.key, c.severity]));

  const catalogue = await Product.find({ isActive: true });
  const picked = [];
  const covered = new Map(); // tag -> number of picks covering it
  const actives = new Set();

  for (const step of ROUTINE) {
    if (step.when && !step.when.some((k) => (severityOf[k] || 0) >= step.min)) continue;

    const inCategory = catalogue.filter((p) => p.category === step.category && !picked.includes(p));
    const suited = inCategory.filter((p) => suitsSkinType(p, skinType));
    const pool = suited.length ? suited : inCategory;

    for (let i = 0; i < (step.count || 1); i++) {
      const ranked = pool
        // Eye products sit on a separate area, so they may share an active;
        // DXB BEAUTY's own products are never blocked by the active check.
        .filter(
          (p) => !picked.includes(p) && (p.featured || step.category === "eye-care" || !actives.has(primaryActive(p)))
        )
        .map((p) => ({ p, score: scoreProduct(p, severities, covered) }))
        // DXB BEAUTY's own products take their step's first slot.
        .sort((a, b) => b.p.featured - a.p.featured || b.score - a.score || b.p.rating - a.p.rating || a.p.price - b.p.price);
      if (!ranked.length) break;
      picked.push(ranked[0].p);
      if (step.category !== "eye-care") actives.add(primaryActive(ranked[0].p));
      ranked[0].p.tags.forEach((t) => covered.set(t, (covered.get(t) || 0) + 1));
    }
  }

  return limit ? picked.slice(0, limit) : picked;
};
