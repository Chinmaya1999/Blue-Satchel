/**
 * K-beauty guide — the right-hand chat on a scan report.
 *
 * Explains how Korean skin care would treat what the scan found (the layered,
 * hydration-first routine, the key ingredients) and, on request, recommends
 * the Korean-brand products in our catalogue. Pure, like scanAdvisor.js:
 * `handleKBeauty(state, input, { scan, profile })`.
 */
import { EMERGENCY, answerFaq, parseSkinType } from "./chatbot.js";
import { goalKeysFromText, ordered, labelOf, concernOf, needsDermatologist } from "./scanAdvisor.js";

// Brands we treat as Korean. Products from these in the catalogue are the
// only ones the guide will recommend.
export const KOREAN_BRANDS = [
  "COSRX", "Beauty of Joseon", "Innisfree", "Laneige", "Anua", "SKIN1004", "Round Lab", "Torriden", "Isntree", "Missha",
  "Etude", "Some By Mi", "Klairs", "Dr. Jart+", "Mediheal", "Purito", "Pyunkang Yul", "Medicube", "Numbuzin", "Tirtir",
  "Banila Co", "I'm From", "Axis-Y", "Abib", "Haruharu Wonder", "Sulwhasoo", "Hera", "Illiyoon", "Dr.G", "Benton",
];

const reply = (text, quick = [], extra = {}) => ({ text, quick, ...extra });
const q = (label, value = label) => ({ label, value });
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const norm = (s) => clean(s).toLowerCase();

// How Korean skin care approaches each concern.
const K_TREAT = {
  spots: "Niacinamide, propolis, rice extract and vitamin C fade marks gradually. Brightening serum in the morning, and SPF always — sun brings spots back.",
  pores: "BHA (betaine/salicylic acid) 2–3 times a week, a low-pH gel cleanser and a weekly clay mask; niacinamide to refine the look of pores.",
  texture: "A gentle PHA/AHA toner or pad twice a week plus snail mucin or hyaluronic essence to smooth and soften.",
  redness: "Centella (cica), mugwort, panthenol and ceramides to calm. Keep steps few, avoid hot water and strong acids.",
  "dark-circles": "A ginseng + retinal or caffeine eye serum, patted gently around the eye, with good sleep and SPF.",
  wrinkles: "Retinal or retinol 2–3 nights a week, peptides and ginseng; hydrate well and wear sunscreen daily.",
  acne: "Centella and BHA for oil and clogged pores, pimple patches on active spots, and a light gel moisturizer. Don't pick.",
  oiliness: "Light gel and water-based textures, niacinamide and BHA — and still moisturize, since skipping it makes skin oilier.",
  moisture: "“Skin flooding”: layer thin hydrators (essence/snail mucin → hyaluronic serum) on damp skin, then seal with a ceramide cream.",
  firmness: "Peptides, ginseng and retinal at night with a rich ceramide cream.",
  radiance: "The “glass skin” approach: propolis, rice and niacinamide, weekly gentle exfoliation and a hydrating mask.",
  "eye-bags": "A cooling caffeine or ginseng eye serum, applied gently by patting, plus sleep and less late-night salt.",
  "droopy-upper-eyelid": "A firming eye serum (peptides, ginseng, retinal) and daily SPF; structural droop needs a doctor's opinion.",
  "droopy-lower-eyelid": "A firming eye serum (peptides, ginseng, retinal) and daily SPF; structural droop needs a doctor's opinion.",
  "tear-trough": "Brightening and firming eye serums help, but they can't fill hollows.",
};

// K-beauty routine by skin type.
const ROUTINES = {
  oily: "AM: gel cleanser → hydrating toner/essence → niacinamide serum → light gel moisturizer → sunscreen.\nPM: balm/oil cleanser (only if you wore sunscreen or makeup) → gel cleanser → toner → serum → gel cream.",
  dry: "AM: creamy cleanser → 2–3 thin layers of hydrating essence → serum → ceramide cream → sunscreen.\nPM: gentle double cleanse → essence layers → serum → rich ceramide cream.",
  combination: "AM: gel cleanser → hydrating toner → serum → light cream (richer on dry cheeks) → sunscreen.\nPM: double cleanse → toner → serum → cream; BHA on the T-zone only, 2 times a week.",
  sensitive: "Keep it to 4–5 steps. AM: gentle cleanser → soothing centella essence → ceramide cream → mineral sunscreen.\nPM: gentle cleanser → essence → ceramide cream. Patch-test everything.",
  normal: "AM: gentle cleanser → hydrating toner/essence → serum → light cream → sunscreen.\nPM: double cleanse → toner → serum → cream; a sheet mask once a week.",
};
ROUTINES.unknown = ROUTINES.normal;

const K_FAQ = [
  { re: /\b(double cleans\w*|oil cleanser|cleansing balm|cleansing oil)\b/, a: "Double cleansing = an oil or balm cleanser first to dissolve sunscreen and makeup, then a gentle water-based cleanser. Do it at night only on days you wore sunscreen or makeup; in the morning one gentle cleanse is enough." },
  { re: /\b(glass skin|glow(ing)? skin|dewy)\b/, a: "“Glass skin” means smooth, hydrated, even-toned skin that reflects light. It comes from consistent hydration (essences, hyaluronic acid), gentle exfoliation, brightening ingredients (niacinamide, propolis) and daily sunscreen — not from one miracle product." },
  { re: /\b(10[- ]?step|ten[- ]?step|how many steps|too many steps)\b/, a: "You don't need all 10 steps. Most people do well with 4–6: cleanser, essence/toner, one serum, moisturizer and sunscreen (plus an oil cleanser at night if you wear sunscreen or makeup). Add a step only when it solves a problem." },
  { re: /\b(snail|mucin)\b/, a: "Snail mucin is a lightweight, hydrating ingredient popular in K-beauty. It helps skin feel plump and smooth and supports the skin barrier; it suits most skin types. Skip it only if you have a snail-product allergy." },
  { re: /\b(centella|cica|tiger grass)\b/, a: "Centella asiatica (cica) is a soothing plant extract that calms redness and irritation and supports the skin barrier. It's a good first choice for sensitive or acne-prone skin." },
  { re: /\b(essence|toner|ampoule)\b/, a: "In K-beauty a toner preps and hydrates skin right after cleansing, while an essence is a slightly more concentrated hydrating treatment. Many routines use just one of them. An ampoule is a small, concentrated serum for a specific goal." },
  { re: /\b(sheet ?mask|masks?|sleeping mask)\b/, a: "Sheet masks are a hydration boost, not a daily necessity: use one 1–2 times a week for 15–20 minutes after cleansing, then seal with moisturizer. Don't leave them on until they dry out." },
  { re: /\b(propolis|rice|ginseng|mugwort)\b/, a: "These are classic Korean ingredients: propolis soothes and brightens, rice extract softens and brightens, ginseng supports firmness and glow, and mugwort calms redness. All are generally gentle — patch-test first." },
  { re: /\b(pha|bha|aha|exfoliat\w*|peeling)\b/, a: "Korean routines favour gentle chemical exfoliation: PHA for sensitive skin, BHA for oil and pores, AHA for dullness. Use it 1–3 times a week, not daily, and always follow with moisturizer and sunscreen." },
  { re: /\b(sunscreen|spf|sun ?block)\b/, a: "Korean sunscreens are known for light, non-greasy textures. Choose SPF 30–50 with PA+++ or higher, apply two finger-lengths every morning and reapply when outdoors." },
  { re: /\b(sensitive|safe|irritat\w*)\b/, a: "K-beauty can suit sensitive skin if you keep it minimal: fragrance-free formulas, centella, ceramides and panthenol, one new product at a time and a patch test before using it on your face." },
  { re: /\b(how long|results?|when will)\b/, a: "Hydration improves within days, but skin renews about every 28 days, so give a routine 6–8 weeks (spots and lines 8–12) before judging it." },
  { re: /\b(order|routine|steps?|layer\w*)\b/, a: "K-beauty layering goes from thinnest to thickest: cleanser → toner/essence → serum/ampoule → (mask, 1–2×/week) → moisturizer → sunscreen in the morning." },
];

export const initialKState = () => ({ step: "goals", goals: [], skinType: null, sensitive: null, planned: false, fails: 0 });

const goalOptions = (scan) => ordered(scan).slice(0, 9).map((c) => ({ label: c.label, value: c.key }));

const PROMPTS = {
  goals: (s, { scan }) =>
    reply("Which goals matter most to you? Pick any, then tap Done — or type it.", goalOptions(scan), {
      input: "multi",
      placeholder: "e.g. glass skin and fewer pimples",
    }),
  skin: () =>
    reply("What's your skin type?", [q("Oily", "oily"), q("Dry", "dry"), q("Mixed", "combination"), q("Normal", "normal"), q("Sensitive", "sensitive")]),
};

const MENU = () => [q("Show Korean products", "cmd:products"), q("Ask about K-beauty", "cmd:ask"), q("Start over", "cmd:redo")];

const kFaq = (text) => K_FAQ.find((f) => f.re.test(norm(text)))?.a || answerFaq(text)?.answer || null;

const buildGuide = (state, scan) => {
  const goals = state.goals.length ? state.goals : ordered(scan).slice(0, 3).map((c) => c.key);
  const rank = (k) => concernOf(scan, k)?.severity ?? 0;
  const focus = [...goals].sort((a, b) => rank(b) - rank(a)).slice(0, 3);
  const treat = focus.map((k) => `• ${labelOf(scan, k)}: ${K_TREAT[k] || "A gentle, hydrating routine with daily sunscreen."}`);
  const out = [
    reply(`Korean skin care treats skin gently: lots of light hydration in thin layers, soothing ingredients, and daily sunscreen. For your goals:\n${treat.join("\n")}`),
    reply(`Your K-beauty routine${state.skinType ? ` (${state.skinType === "combination" ? "mixed" : state.skinType} skin)` : ""}:\n${ROUTINES[state.skinType] || ROUTINES.normal}`),
  ];
  const tips = ["Add one new product at a time and patch-test first.", "Less is more — 4–6 steps is plenty."];
  if (needsDermatologist(scan)) tips.push("Some findings are on the stronger side; a dermatologist visit is worth it (clinics are listed below).");
  out.push(reply(tips.map((t) => `• ${t}`).join("\n"), MENU()));
  return out;
};

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|show( me)?|y)\b/;

export const handleKBeauty = (prev, input = {}, { scan, profile = {} }) => {
  const state = { ...initialKState(), ...prev, goals: [...(prev.goals || [])] };
  const text = clean(input.text).slice(0, 500);
  const t = norm(text);
  const values = (Array.isArray(input.values) ? input.values : []).map(String).slice(0, 20);
  const out = { state, replies: [], action: null };
  const say = (...r) => out.replies.push(...r);
  const ask = () => say(PROMPTS[state.step](state, { scan }));
  const showProducts = () => {
    if (!state.goals.length) state.goals = ordered(scan).slice(0, 3).map((c) => c.key);
    out.action = "products";
    say(reply("Here are Korean skin-care products from our shop that fit your goals:"));
  };

  if (input.init) {
    say(
      reply(
        "Hi! 🇰🇷 I'm your K-beauty guide. I'll show how Korean skin care would treat what your scan found, and suggest Korean products from our shop."
      )
    );
    ask();
    return out;
  }
  if (t === "cmd:redo") {
    Object.assign(state, initialKState());
    say(reply("Sure, let's start again."));
    ask();
    return out;
  }
  if (t === "cmd:products") {
    showProducts();
    return out;
  }
  if (t === "cmd:ask") {
    say(reply("Ask me anything — double cleansing, glass skin, snail mucin, centella, essences, sheet masks, the 10-step routine…", state.planned ? MENU() : []));
    if (!state.planned) ask();
    return out;
  }
  if (EMERGENCY.test(t)) {
    say(reply("What you describe may need a doctor rather than skin-care products — please see a dermatologist soon (clinics are listed below). I can't diagnose skin conditions."));
    if (!state.planned) ask();
    return out;
  }

  const answer = () => {
    const a = kFaq(text);
    if (!a) return false;
    say(reply(a));
    if (state.planned) say(reply("Anything else?", MENU()));
    else ask();
    return true;
  };

  if (state.planned) {
    if (answer()) return out;
    if (YES.test(t) || /\b(products?|recommend|suggest)\b/.test(t)) showProducts();
    else say(reply("I can show Korean products or answer a K-beauty question.", MENU()));
    return out;
  }

  const fail = () => {
    if (answer()) return;
    state.fails += 1;
    say(reply(state.step === "goals" ? "Tap an option, or use words like glow, pores, acne, dryness or wrinkles. Say “you choose” to use your top findings." : "Is your skin oily, dry, mixed, normal or sensitive?"));
    ask();
  };
  const finish = () => {
    state.planned = true;
    state.step = "plan";
    state.fails = 0;
    say(...buildGuide(state, scan));
  };

  if (state.step === "goals") {
    const known = new Set((scan.concerns || []).map((c) => c.key));
    const keys = new Set(values.filter((v) => known.has(v)));
    goalKeysFromText(text).forEach((k) => keys.add(k));
    if (/\b(glass skin|glow|dewy)\b/.test(t)) keys.add("radiance");
    if (!keys.size && /\b(you choose|top|anything|whatever|not sure|suggest)\b/.test(t)) ordered(scan).slice(0, 3).forEach((c) => keys.add(c.key));
    if (!keys.size) return fail(), out;
    state.goals = [...keys];
    state.fails = 0;
    const skin = profile.skinType && profile.skinType !== "unknown" ? profile.skinType : null;
    if (skin) {
      state.skinType = skin;
      if (skin === "sensitive") state.sensitive = true;
      finish();
    } else {
      state.step = "skin";
      ask();
    }
  } else if (state.step === "skin") {
    const skin = parseSkinType(t.replace(/\bmixed\b/, "combination"));
    if (!skin || skin === "unknown") return fail(), out;
    state.skinType = skin;
    if (skin === "sensitive") state.sensitive = true;
    finish();
  } else {
    Object.assign(state, initialKState());
    ask();
  }
  return out;
};
