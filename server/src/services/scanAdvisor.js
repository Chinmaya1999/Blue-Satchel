/**
 * Scan advisor — the chat that replaces the product grid on a scan report.
 *
 * It reads the scan (overall score, per-concern severity), asks the customer
 * what they want to improve and about their lifestyle, skin and current
 * routine, then explains a personalised plan. Products and nearby
 * dermatologists are only shown when the customer asks for them.
 *
 * Pure, like chatbot.js: `handleAdvisor(state, input, { scan, profile })`
 * returns the new state, what to say, and an optional `action`
 * ("products" | "dermatologists") for the controller/client to carry out.
 */
import { EMERGENCY, answerFaq, parseConcerns, parseSkinType } from "./chatbot.js";

const reply = (text, quick = [], extra = {}) => ({ text, quick, ...extra });
const q = (label, value = label) => ({ label, value });
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const norm = (s) => clean(s).toLowerCase();

// Guidance per concern key the scan providers emit.
const ADVICE = {
  spots: { why: "uneven pigment, usually from sun exposure and old breakouts", todo: "use sunscreen daily and add a brightening active in the morning", look: "vitamin C, niacinamide, alpha arbutin" },
  pores: { why: "oil and dead skin building up in the pores", todo: "cleanse twice a day and use a gentle exfoliating acid 2–3 times a week", look: "salicylic acid (BHA), niacinamide, clay masks" },
  texture: { why: "dead skin building up and slow cell turnover", todo: "exfoliate gently a few times a week and keep skin hydrated", look: "lactic/glycolic acid, retinol, urea" },
  redness: { why: "a stressed or irritated skin barrier", todo: "keep the routine short, avoid hot water and harsh scrubs, and protect from the sun", look: "centella, ceramides, panthenol, azelaic acid" },
  "dark-circles": { why: "thin under-eye skin, pigment, tiredness and genetics", todo: "sleep 7–8 hours, wear sunscreen and use an eye product daily", look: "caffeine, vitamin C, peptides" },
  wrinkles: { why: "sun damage, expression lines and lower collagen", todo: "daily SPF is the top step; add a retinoid at night", look: "retinol, peptides, antioxidants" },
  acne: { why: "excess oil, clogged pores and bacteria", todo: "don't pick, cleanse gently and use a non-comedogenic moisturizer", look: "salicylic acid, niacinamide, azelaic acid, zinc" },
  oiliness: { why: "very active oil glands, often worsened by over-washing", todo: "use a gel cleanser and a light moisturizer — don't skip hydration", look: "niacinamide, zinc, salicylic acid" },
  moisture: { why: "a weak moisture barrier that loses water easily", todo: "hydrate on damp skin and seal it with a moisturizer", look: "hyaluronic acid, ceramides, glycerin, squalane" },
  firmness: { why: "collagen loss over time, made worse by sun", todo: "daily SPF, retinol at night and good sleep", look: "retinol, peptides, vitamin C" },
  radiance: { why: "dull surface cells, dehydration and tanning", todo: "exfoliate lightly, hydrate, and use antioxidants plus SPF", look: "vitamin C, AHAs, niacinamide" },
  "eye-bags": { why: "fluid retention, sleep, salt intake and genetics", todo: "sleep with your head slightly raised, cut late-night salt and use a cooling eye product", look: "caffeine, peptides" },
  "droopy-upper-eyelid": { why: "loosening skin and muscle around the eyes", todo: "daily SPF and a firming eye product; structural droop needs a doctor's opinion", look: "peptides, retinol (gentle)" },
  "droopy-lower-eyelid": { why: "loosening skin and muscle around the eyes", todo: "daily SPF and a firming eye product; structural droop needs a doctor's opinion", look: "peptides, retinol (gentle)" },
  "tear-trough": { why: "hollowing under the eyes, mostly genetic", todo: "creams can brighten and smooth, but they can't fill hollows", look: "vitamin C, peptides, caffeine" },
};
const FALLBACK_ADVICE = { why: "a combination of habits and skin type", todo: "keep a simple routine with daily sunscreen", look: "gentle, fragrance-free formulas" };

// Chat concern words (from chatbot.js) -> the scan's concern keys.
const WORD_TO_KEY = { hydration: ["moisture"], brightening: ["radiance"], "anti-aging": ["wrinkles", "firmness"] };
export const goalKeysFromText = (text) => parseConcerns(text).flatMap((t) => WORD_TO_KEY[t] || [t]);

export const ordered = (scan) => [...(scan.concerns || [])].sort((a, b) => b.severity - a.severity);
export const labelOf = (scan, key) => (scan.concerns || []).find((c) => c.key === key)?.label || key.replace(/-/g, " ");
export const concernOf = (scan, key) => (scan.concerns || []).find((c) => c.key === key);

// Does the report itself suggest seeing a doctor?
export const needsDermatologist = (scan) =>
  (scan.concerns || []).some((c) => c.severity >= 80 || (["acne", "redness"].includes(c.key) && c.severity >= 70));

export const initialAdvisorState = () => ({ step: "goals", goals: [], skinType: null, sensitive: null, planned: false, fails: 0 });

// ---------------------------------------------------------------- prompts

const goalOptions = (scan) =>
  ordered(scan).slice(0, 9).map((c) => ({ label: `${c.label} · ${c.level}`, value: c.key }));

const PROMPTS = {
  goals: (s, { scan }) =>
    reply("What would you like to improve? Pick any, then tap Done — or type it.", goalOptions(scan), {
      input: "multi",
      placeholder: "e.g. clear pores and fade spots",
    }),
  skin: () =>
    reply("And how does your skin feel by afternoon?", [
      q("Oily", "oily"), q("Dry", "dry"), q("Mixed", "combination"), q("Comfortable", "normal"), q("Sensitive", "sensitive"),
    ]),
};

const MENU = () => [q("Show recommended products", "cmd:products"), q("Ask a skin question", "cmd:ask"), q("Start over", "cmd:redo")];

const STEP_ERROR = {
  goals: "I couldn't match that. Tap an option, or use words like pores, dark spots, acne, dryness or wrinkles. Say “you choose” and I'll focus on your top findings.",
  skin: "Is your skin oily, dry, mixed, comfortable or sensitive?",
};

// ------------------------------------------------------------------ plan

const buildPlan = (state, scan) => {
  const goals = state.goals.length ? state.goals : ordered(scan).slice(0, 3).map((c) => c.key);
  const rank = (k) => concernOf(scan, k)?.severity ?? 0;
  const focus = [...goals].sort((a, b) => rank(b) - rank(a)).slice(0, 3);

  const lines = focus.map((key) => {
    const a = ADVICE[key] || FALLBACK_ADVICE;
    const c = concernOf(scan, key);
    return `• ${c ? `${c.label} (${c.level})` : labelOf(scan, key)}: ${a.todo}. Look for ${a.look}.`;
  });
  const out = [reply(`Here's your plan:\n${lines.join("\n")}`)];

  const extra = [];
  if (state.sensitive) extra.push("Your skin is easily irritated, so choose fragrance-free formulas and add one new product at a time.");
  extra.push("Use sunscreen every morning — it matters for almost every concern.");
  if (needsDermatologist(scan)) extra.push("Some findings are on the stronger side, so a dermatologist visit is worth it — see the clinics below.");
  out.push(reply(extra.map((t) => `• ${t}`).join("\n"), MENU()));
  return out;
};

// ---------------------------------------------------------------- the turn

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|show( me)?|y)\b/;
const NO = /^(no|nope|nah|not now|later|n)\b/;

export const handleAdvisor = (prev, input = {}, { scan, profile = {} }) => {
  const state = { ...initialAdvisorState(), ...prev, goals: [...(prev.goals || [])] };
  const text = clean(input.text).slice(0, 500);
  const t = norm(text);
  const values = (Array.isArray(input.values) ? input.values : []).map(String).slice(0, 20);
  const out = { state, replies: [], action: null };
  const say = (...r) => out.replies.push(...r);
  const ask = () => say(PROMPTS[state.step](state, { scan }));
  const showProducts = (intro) => {
    // Products can be asked for at any time; without answers, use the top findings.
    if (!state.goals.length) state.goals = ordered(scan).slice(0, 3).map((c) => c.key);
    out.action = "products";
    say(reply(intro));
  };

  // First call: one short intro, then the first question.
  if (input.init) {
    const top = ordered(scan).slice(0, 3);
    say(
      reply(
        `Hi! Your scan scored ${scan.overallScore}/100 (${scan.overallLabel}).${top.length ? ` Top areas: ${top.map((c) => `${c.label.toLowerCase()} (${c.level})`).join(", ")}.` : ""} Two quick questions and I'll give you a plan.`
      )
    );
    ask();
    return out;
  }

  if (t === "cmd:redo") {
    Object.assign(state, initialAdvisorState());
    say(reply("Sure, let's redo it."));
    ask();
    return out;
  }
  if (t === "cmd:products") {
    showProducts(state.planned ? "Here are products for your plan, in order of use:" : "Here are picks for your top findings, in order of use:");
    return out;
  }
  if (t === "cmd:derm" || (/\b(dermatologists?|skin doctor|doctor|clinic)\b/.test(t) && !EMERGENCY.test(t))) {
    out.action = "dermatologists";
    say(reply("Scrolling to the dermatologists near you below. Please call ahead to check timings.", state.planned ? MENU() : []));
    if (!state.planned) ask();
    return out;
  }
  if (EMERGENCY.test(t)) {
    out.action = "dermatologists";
    say(reply("What you describe may need a doctor rather than skin-care products — please see a dermatologist soon (clinics are listed below). I can't diagnose skin conditions."));
    if (!state.planned) ask();
    return out;
  }
  if (t === "cmd:ask") {
    say(reply("Ask me anything — acne, sunscreen, retinol, routines, dark circles, pores and more.", state.planned ? MENU() : []));
    if (!state.planned) ask();
    return out;
  }

  const faq = () => {
    const f = answerFaq(text);
    if (!f) return false;
    say(reply(f.answer));
    if (state.planned) say(reply("Anything else?", MENU()));
    else ask();
    return true;
  };

  // After the plan: open conversation.
  if (state.planned) {
    if (faq()) return out;
    if (YES.test(t) || /\b(products?|recommend|suggest)\b/.test(t)) showProducts("Here are products for your plan, in order of use:");
    else if (NO.test(t)) say(reply("No problem — I'm here if you change your mind.", MENU()));
    else if (/\b(thanks|thank you|great)\b/.test(t)) say(reply("You're welcome! 💙", MENU()));
    else say(reply("I can show recommended products or answer a skin question.", MENU()));
    return out;
  }

  const fail = () => {
    if (faq()) return;
    state.fails += 1;
    say(reply(STEP_ERROR[state.step] || "Sorry, I didn't catch that."));
    ask();
  };
  const finishPlan = () => {
    state.planned = true;
    state.step = "plan";
    state.fails = 0;
    say(...buildPlan(state, scan));
  };

  if (state.step === "goals") {
    const known = new Set((scan.concerns || []).map((c) => c.key));
    const keys = new Set(values.filter((v) => known.has(v)));
    goalKeysFromText(text).forEach((k) => keys.add(k));
    if (!keys.size && /\b(you choose|top|anything|whatever|not sure|don'?t know|suggest)\b/.test(t)) {
      ordered(scan).slice(0, 3).forEach((c) => keys.add(c.key));
    }
    if (!keys.size) return fail(), out;
    state.goals = [...keys];
    state.fails = 0;
    const skin = profile.skinType && profile.skinType !== "unknown" ? profile.skinType : null;
    if (skin) {
      state.skinType = skin;
      if (skin === "sensitive") state.sensitive = true;
      finishPlan();
    } else {
      state.step = "skin";
      ask();
    }
  } else if (state.step === "skin") {
    const skin = parseSkinType(t.replace(/\b(mixed|comfortable)\b/, (m) => (m === "mixed" ? "combination" : "normal")));
    if (!skin) return fail(), out;
    state.skinType = skin;
    if (skin === "sensitive") state.sensitive = true;
    finishPlan();
  } else {
    Object.assign(state, initialAdvisorState());
    ask();
  }
  return out;
};
