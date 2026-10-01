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

const LIFESTYLE = {
  sun: { label: "Lots of sun / outdoors", re: /\b(sun|outdoor|outside|commut\w*|travel)\b/, tip: "Wear SPF 30–50 every morning and reapply every 2–3 hours when outdoors — sun is the biggest driver of spots and lines." },
  sleep: { label: "Late nights / poor sleep", re: /\b(sleep|late night|insomnia|tired)\b/, tip: "Aim for 7–8 hours; skin repairs itself at night, and poor sleep worsens dark circles and dullness." },
  stress: { label: "High stress", re: /\b(stress\w*|anxi\w*|pressure)\b/, tip: "Stress raises oil and breakouts — short breaks, walks and a consistent routine help skin too." },
  screen: { label: "Long screen time", re: /\b(screen|laptop|phone|computer|desk)\b/, tip: "Hydrate through the day and look away from screens regularly; a hydrating moisturizer helps tired, dry-looking skin." },
  makeup: { label: "I wear makeup daily", re: /\b(makeup|make-up|foundation)\b/, tip: "Remove makeup every night with a gentle cleanser — sleeping in it clogs pores." },
  workout: { label: "I sweat / exercise a lot", re: /\b(sweat\w*|gym|workout|exercise|sport\w*)\b/, tip: "Cleanse after sweating and use a light, non-comedogenic moisturizer and sunscreen." },
  city: { label: "City / pollution", re: /\b(pollut\w*|city|dust|smog)\b/, tip: "Double-cleanse at night and use antioxidants (vitamin C) in the morning to handle pollution." },
  smoke: { label: "I smoke / vape", re: /\b(smok\w*|vap\w*|tobacco)\b/, tip: "Smoking speeds up lines and dullness — cutting down helps skin as much as any product." },
};
const ROUTINE_ITEMS = {
  cleanser: { label: "Cleanser", re: /\b(cleanser|face ?wash)\b/ },
  moisturizer: { label: "Moisturizer", re: /\b(moisturi[sz]er|cream|lotion)\b/ },
  sunscreen: { label: "Sunscreen", re: /\b(sunscreen|spf|sun ?block)\b/ },
  serum: { label: "Serum", re: /\b(serum)\b/ },
  actives: { label: "Retinol / acids", re: /\b(retinol|retinoid|acid|aha|bha|actives?)\b/ },
};

// Chat concern words (from chatbot.js) -> the scan's concern keys.
const WORD_TO_KEY = { hydration: ["moisture"], brightening: ["radiance"], "anti-aging": ["wrinkles", "firmness"] };
const goalKeysFromText = (text) => parseConcerns(text).flatMap((t) => WORD_TO_KEY[t] || [t]);

const ordered = (scan) => [...(scan.concerns || [])].sort((a, b) => b.severity - a.severity);
const labelOf = (scan, key) => (scan.concerns || []).find((c) => c.key === key)?.label || key.replace(/-/g, " ");
const concernOf = (scan, key) => (scan.concerns || []).find((c) => c.key === key);

// Does the report itself suggest seeing a doctor?
export const needsDermatologist = (scan) =>
  (scan.concerns || []).some((c) => c.severity >= 80 || (["acne", "redness"].includes(c.key) && c.severity >= 70));

export const initialAdvisorState = () => ({ step: "goals", goals: [], lifestyle: [], skinType: null, sensitive: null, routine: [], planned: false, lastAsk: null, fails: 0 });

// ---------------------------------------------------------------- prompts

const goalOptions = (scan) =>
  ordered(scan).slice(0, 9).map((c) => ({ label: `${c.label} · ${c.level}`, value: c.key }));

const PROMPTS = {
  goals: (s, { scan }) =>
    reply("What would you like to improve most? Pick all that apply, then tap Done — or type it in your own words.", goalOptions(scan), {
      input: "multi",
      placeholder: "e.g. clear my pores and fade spots",
    }),
  lifestyle: () =>
    reply("Which of these describe your daily life? Pick any, then tap Done.", Object.entries(LIFESTYLE).map(([k, v]) => q(v.label, k)), {
      input: "multi",
      placeholder: "or type, e.g. I work night shifts",
    }),
  skin: () =>
    reply("How does your skin usually feel by the afternoon?", [q("Oily / shiny", "oily"), q("Tight / dry", "dry"), q("Oily T-zone, dry cheeks", "combination"), q("Comfortable", "normal"), q("Not sure", "unknown")]),
  sensitivity: () => reply("Does your skin react easily — stinging, burning or redness with new products?", [q("Yes, easily", "yes"), q("Sometimes", "sometimes"), q("No", "no")]),
  routine: () =>
    reply("What do you already use regularly? Pick all that apply, then tap Done.", Object.entries(ROUTINE_ITEMS).map(([k, v]) => q(v.label, k)), {
      input: "multi",
      placeholder: "or say “nothing yet”",
    }),
};

const MENU = (scan) => [
  q("Show me products", "cmd:products"),
  q(needsDermatologist(scan) ? "Find a dermatologist (recommended)" : "Find dermatologists near me", "cmd:derm"),
  q("Ask a skin question", "cmd:ask"),
  q("Change my answers", "cmd:redo"),
];

const STEP_ERROR = {
  goals: "I couldn't match that to a concern. Tap the options, or use words like pores, dark spots, acne, dryness or wrinkles. Say “you choose” and I'll focus on your top findings.",
  skin: "Is your skin oily, dry, combination or comfortable? Pick “Not sure” if you don't know.",
  sensitivity: "Does your skin react easily to new products? Yes, sometimes or no is fine.",
};

// ------------------------------------------------------------------ plan

const buildPlan = (state, scan) => {
  const out = [];
  const goals = state.goals.length ? state.goals : ordered(scan).slice(0, 3).map((c) => c.key);
  const rank = (k) => concernOf(scan, k)?.severity ?? 0;
  const focus = [...goals].sort((a, b) => rank(b) - rank(a)).slice(0, 4);

  out.push(
    reply(
      `Thanks! Here's my analysis. Your scan scored ${scan.overallScore}/100 (${scan.overallLabel}). I'll focus on what you chose: ${focus.map((k) => labelOf(scan, k).toLowerCase()).join(", ")}.`
    )
  );

  for (const key of focus) {
    const a = ADVICE[key] || FALLBACK_ADVICE;
    const c = concernOf(scan, key);
    const head = c ? `${c.label} — ${c.level} (${c.severity}/100)` : labelOf(scan, key);
    out.push(reply(`• ${head}\nLikely cause: ${a.why}.\nWhat helps: ${a.todo}.\nLook for: ${a.look}.`));
  }

  const tips = state.lifestyle.map((k) => LIFESTYLE[k]?.tip).filter(Boolean).slice(0, 3);
  if (tips.length) out.push(reply(`Lifestyle tips for you:\n${tips.map((t) => `• ${t}`).join("\n")}`));

  const have = new Set(state.routine);
  const gaps = [];
  if (!have.size) gaps.push("You're starting fresh, so begin with just three basics — cleanser, moisturizer and sunscreen — and add one treatment at a time.");
  else {
    if (!have.has("sunscreen")) gaps.push("You're missing sunscreen — it's the most important step for most of these concerns.");
    if (!have.has("moisturizer")) gaps.push("A moisturizer would support your skin barrier and help every active work better.");
    if (!have.has("cleanser")) gaps.push("A gentle cleanser will keep pores clear and prepare skin for treatments.");
    if (have.has("actives")) gaps.push("Since you already use retinol/acids, introduce nothing else strong at the same time and don't layer several actives together.");
  }
  if (state.sensitive) gaps.push("Because your skin is easily irritated, choose fragrance-free formulas, patch-test, and add one new product every 2 weeks.");
  if (gaps.length) out.push(reply(`Your routine:\n${gaps.map((t) => `• ${t}`).join("\n")}`));

  if (needsDermatologist(scan)) {
    out.push(
      reply(
        "One more thing: a few of your findings are on the stronger side. Products can help, but a dermatologist can examine your skin in person and prescribe treatment if needed — I'd suggest booking a visit."
      )
    );
  }

  out.push(reply("Would you like me to show products that match this plan?", MENU(scan)));
  return out;
};

// ---------------------------------------------------------------- the turn

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|show( me)?|y)\b/;
const NO = /^(no|nope|nah|not now|later|n)\b/;

export const handleAdvisor = (prev, input = {}, { scan, profile = {} }) => {
  const state = { ...initialAdvisorState(), ...prev, goals: [...(prev.goals || [])], lifestyle: [...(prev.lifestyle || [])], routine: [...(prev.routine || [])] };
  const text = clean(input.text).slice(0, 500);
  const t = norm(text);
  const values = (Array.isArray(input.values) ? input.values : []).map(String).slice(0, 20);
  const out = { state, replies: [], action: null };
  const say = (...r) => out.replies.push(...r);
  const ask = () => say(PROMPTS[state.step](state, { scan }));
  const none = /^(none|nothing( yet)?|no|nope|skip|n\/a|nothing at all)\b/.test(t) || values.includes("none");

  // First call: introduce the findings and ask the first question.
  if (input.init) {
    const top = ordered(scan).slice(0, 3);
    say(
      reply(
        `Hi! I've gone through your scan. Overall: ${scan.overallScore}/100 (${scan.overallLabel}).${top.length ? ` The areas that stand out are ${top.map((c) => `${c.label.toLowerCase()} (${c.level})`).join(", ")}.` : ""}`
      ),
      reply("I'll ask a few quick questions, then give you a plan. Products only if you want them — and I'm not a doctor, so for medical concerns please see a dermatologist.")
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
  if (t === "cmd:derm" || (/\b(dermatologists?|skin doctor|doctor|clinic)\b/.test(t) && !EMERGENCY.test(t))) {
    out.action = "dermatologists";
    say(reply("Here are skin clinics near you. Please call ahead to check timings and availability."), reply("Anything else?", MENU(scan)));
    return out;
  }
  if (EMERGENCY.test(t)) {
    out.action = "dermatologists";
    say(reply("What you describe may need a doctor rather than skin-care products — please see a dermatologist soon. Here are some near you. I can't diagnose skin conditions."));
    if (!state.planned) ask();
    return out;
  }
  if (t === "cmd:ask") {
    say(reply("Ask me anything — acne, sunscreen, retinol, routines, dark circles, pores and more.", state.planned ? MENU(scan) : []));
    if (!state.planned) ask();
    return out;
  }
  if (t === "cmd:products") {
    if (!state.planned) {
      say(reply("Let me finish understanding your skin first so the picks fit you."));
      ask();
    } else {
      out.action = "products";
      say(reply("Here's a routine built from your scan and your answers. Use the products in this order:"));
    }
    return out;
  }

  const faq = () => {
    const f = answerFaq(text);
    if (!f) return false;
    say(reply(f.answer));
    if (state.planned) say(reply("Anything else I can help with?", MENU(scan)));
    else {
      say(reply("Back to your plan 👇"));
      ask();
    }
    return true;
  };

  // After the plan: open conversation, "yes" shows products.
  if (state.planned) {
    if (faq()) return out;
    if (YES.test(t) || /\b(products?|recommend|suggest|routine)\b/.test(t)) {
      out.action = "products";
      say(reply("Here's a routine built from your scan and your answers. Use the products in this order:"));
    } else if (NO.test(t)) say(reply("No problem — I'm here if you change your mind.", MENU(scan)));
    else if (/\b(thanks|thank you|great)\b/.test(t)) say(reply("You're welcome! 💙", MENU(scan)));
    else say(reply("I can show products, find dermatologists, or answer a skin question.", MENU(scan)));
    return out;
  }

  const next = (to) => {
    state.fails = 0;
    state.step = to;
  };
  const fail = () => {
    if (faq()) return;
    state.fails += 1;
    say(reply(STEP_ERROR[state.step] || "Sorry, I didn't catch that."));
    ask();
  };
  const finishPlan = () => {
    state.planned = true;
    state.step = "plan";
    say(...buildPlan(state, scan));
  };

  switch (state.step) {
    case "goals": {
      const known = new Set((scan.concerns || []).map((c) => c.key));
      const keys = new Set(values.filter((v) => known.has(v)));
      goalKeysFromText(text).forEach((k) => keys.add(k));
      if (/\b(you choose|top|anything|whatever|not sure|don'?t know|suggest)\b/.test(t) && !keys.size) {
        ordered(scan).slice(0, 3).forEach((c) => keys.add(c.key));
      }
      if (!keys.size) return fail(), out;
      state.goals = [...keys];
      say(reply(`Got it — ${state.goals.map((k) => labelOf(scan, k).toLowerCase()).join(", ")}.`));
      next("lifestyle");
      ask();
      break;
    }
    case "lifestyle": {
      const found = new Set(values.filter((v) => LIFESTYLE[v]));
      if (!none) for (const [k, v] of Object.entries(LIFESTYLE)) if (v.re.test(t)) found.add(k);
      if (!found.size && !none && text && !values.length) return fail(), out;
      state.lifestyle = [...found];
      const known = profile.skinType && profile.skinType !== "unknown" ? profile.skinType : null;
      if (known) {
        state.skinType = known;
        next(known === "sensitive" ? "routine" : "sensitivity");
        if (known === "sensitive") state.sensitive = true;
      } else next("skin");
      ask();
      break;
    }
    case "skin": {
      const skin = parseSkinType(t);
      if (!skin) return fail(), out;
      state.skinType = skin;
      next("sensitivity");
      ask();
      break;
    }
    case "sensitivity": {
      const yes = /^(yes|yeah|yep|often|easily)\b|\b(burn|sting|react|irritat\w*)\b/.test(t);
      const no = /^(no|nope|nah|never|rarely|not really)\b/.test(t);
      const sometimes = /\b(sometimes|a little|maybe)\b/.test(t);
      if (!yes && !no && !sometimes) return fail(), out;
      state.sensitive = !no;
      next("routine");
      ask();
      break;
    }
    case "routine": {
      const found = new Set(values.filter((v) => ROUTINE_ITEMS[v]));
      if (!none) for (const [k, v] of Object.entries(ROUTINE_ITEMS)) if (v.re.test(t)) found.add(k);
      state.routine = [...found];
      state.fails = 0;
      finishPlan();
      break;
    }
    default:
      Object.assign(state, initialAdvisorState());
      ask();
  }
  return out;
};
