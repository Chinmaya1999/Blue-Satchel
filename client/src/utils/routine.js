// Mirrors CONCERN_TO_TAGS / SEVERITY_FLOOR in
// server/src/services/recommendationEngine.js — keep the two in sync.
const CONCERN_TO_TAGS = {
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

const SEVERITY_FLOOR = 20;

export const ROUTINE_STEP_LABELS = {
  cleanser: "Cleanse",
  toner: "Exfoliate",
  treatment: "Treat",
  serum: "Serum",
  "eye-care": "Eye care",
  moisturizer: "Moisturize",
  sunscreen: "Protect · AM",
  mask: "Mask",
};

// The scan concerns (labels, most severe first) this product addresses.
export const concernsTargeted = (product, concerns = []) =>
  concerns
    .filter((c) => c.severity > SEVERITY_FLOOR && (CONCERN_TO_TAGS[c.key] || []).some((t) => product.tags?.includes(t)))
    .sort((a, b) => b.severity - a.severity)
    .map((c) => c.label);
