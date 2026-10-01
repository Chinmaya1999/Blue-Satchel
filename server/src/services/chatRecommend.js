import { recommendProducts } from "./recommendationEngine.js";
import { hasStrongActive, concernLabel } from "./chatbot.js";

/**
 * Turns the chatbot's answers into a product routine. It reuses the scan
 * recommendation engine (so chat and scan picks agree), then applies what the
 * engine doesn't know about: budget, sensitivity and age.
 */

// Chat concern -> the engine's concern keys.
const TO_ENGINE = {
  acne: ["acne"],
  spots: ["spots"],
  pores: ["pores"],
  texture: ["texture"],
  redness: ["redness"],
  "dark-circles": ["dark-circles"],
  "eye-bags": ["eye-bags"],
  hydration: ["moisture"],
  "anti-aging": ["wrinkles", "firmness"],
  wrinkles: ["wrinkles"],
  firmness: ["firmness"],
  oiliness: ["oiliness"],
  brightening: ["radiance"],
};
// ...and to the tags products carry.
const TO_TAGS = { ...TO_ENGINE, hydration: ["hydration"], brightening: ["brightening"] };

const STEP_LABEL = {
  cleanser: "Cleanse",
  toner: "Prep",
  treatment: "Treat",
  serum: "Serum",
  "eye-care": "Eyes",
  moisturizer: "Moisturize",
  sunscreen: "Protect (AM)",
};

// What to drop first when the routine is over budget.
const DROP_ORDER = ["toner", "eye-care", "treatment", "serum"];

const skinForEngine = (s) => {
  if (s.skinType && s.skinType !== "unknown") return s.skinType;
  return s.sensitive ? "sensitive" : undefined;
};

// Product tags behind each engine concern key (for the "why" line).
const ENGINE_KEY_TAGS = { moisture: ["hydration"], radiance: ["brightening"] };

/**
 * `engineConcerns` ([{ key, severity }]) lets a caller that already has scores
 * (the scan advisor) bypass the chat concern words.
 */
export const buildRoutine = async (s, { engineConcerns } = {}) => {
  const concerns = engineConcerns || (s.concerns || []).flatMap((c) => (TO_ENGINE[c] || []).map((key) => ({ key, severity: 75 })));
  let picks = await recommendProducts(concerns, { skinType: skinForEngine(s) });
  const notes = [];

  const gentle = s.sensitive || s.ageBand === "under-18";
  if (gentle) {
    const kept = picks.filter((p) => !hasStrongActive(p));
    if (kept.length >= 3 && kept.length < picks.length) {
      notes.push("I left out products with strong actives (like retinol or acids) because you want something gentle.");
      picks = kept;
    }
  }
  if (s.ageBand === "under-18") picks = picks.filter((p) => ["cleanser", "moisturizer", "sunscreen"].includes(p.category));
  // Anti-aging products aren't needed for young skin unless asked for.
  if (["under-18", "18-24"].includes(s.ageBand) && !(s.concerns || []).some((c) => ["wrinkles", "firmness", "anti-aging"].includes(c))) {
    picks = picks.filter((p) => !(p.tags.includes("wrinkles") && p.category === "treatment"));
  }

  const total = (list) => list.reduce((sum, p) => sum + p.price, 0);
  const budget = Number(s.budget) || 0;
  let overBudget = false;
  if (budget > 0 && total(picks) > budget) {
    for (const cat of DROP_ORDER) {
      while (total(picks) > budget) {
        const idx = picks.map((p) => p.category).lastIndexOf(cat);
        if (idx === -1) break;
        picks.splice(idx, 1);
      }
      if (total(picks) <= budget) break;
    }
    if (total(picks) > budget) overBudget = true;
    notes.push(
      overBudget
        ? `Even the essentials come to ₹${total(picks)}, a little over your ₹${budget} budget — you can start with just the cleanser and sunscreen.`
        : `I trimmed the routine to fit your ₹${budget} budget and kept the essentials.`
    );
  }

  const wanted = new Set(
    engineConcerns
      ? engineConcerns.filter((c) => c.severity > 20).flatMap((c) => ENGINE_KEY_TAGS[c.key] || [c.key])
      : (s.concerns || []).flatMap((c) => TO_TAGS[c] || [])
  );
  const products = picks.map((p, i) => {
    const matched = p.tags.filter((t) => wanted.has(t));
    const why = matched.length
      ? `Targets ${matched.map((t) => t.replace("-", " ")).join(", ")}`
      : `Gentle daily ${p.category.replace("-", " ")}`;
    return {
      _id: p._id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      imageUrl: p.imageUrl,
      stock: p.stock,
      stepLabel: `${i + 1} · ${STEP_LABEL[p.category] || p.category}`,
      reason: why,
    };
  });

  const summary = engineConcerns ? "" : (s.concerns || []).map((c) => concernLabel(c).toLowerCase()).join(", ");
  return { products, total: total(picks), notes, summary };
};
