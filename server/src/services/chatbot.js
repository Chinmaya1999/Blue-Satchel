/**
 * DXB BEAUTY skin-care assistant — the conversation engine.
 *
 * A guided interview (name → skin type → concerns → sensitivity → age →
 * budget → contact) that ends in product picks, with a skin-care Q&A layer
 * that answers questions at any point and then returns to the interview.
 *
 * `handleTurn` is pure: it takes the saved conversation state plus the
 * visitor's input and returns the new state and what to say. Persistence and
 * product ranking live in chatController / chatRecommend, so this file can be
 * tested without a database.
 */
import { CONCERN_TAGS } from "../models/Product.js";

export const STEPS = ["name", "skinType", "concerns", "sensitivity", "age", "budget", "contact", "phone"];

export const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal", "unknown"];
export const AGE_BANDS = ["under-18", "18-24", "25-34", "35-44", "45-54", "55-plus"];

const CONCERN_LABEL = {
  acne: "Acne & breakouts",
  spots: "Dark spots",
  pores: "Large pores",
  texture: "Rough texture",
  redness: "Redness",
  "dark-circles": "Dark circles",
  "eye-bags": "Eye bags",
  hydration: "Dryness",
  "anti-aging": "Anti-aging",
  wrinkles: "Fine lines & wrinkles",
  firmness: "Loss of firmness",
  oiliness: "Excess oil",
  brightening: "Dullness",
};
const CONCERN_CHOICES = Object.keys(CONCERN_LABEL).filter((c) => CONCERN_TAGS.includes(c) || c === "anti-aging");

const CONCERN_WORDS = [
  ["acne", /\b(acne|pimples?|zits?|break ?outs?|blemish(es)?|whiteheads?)\b/],
  ["spots", /\b(dark spots?|pigmentation|hyperpigmentation|melasma|sun ?spots?|age spots?|marks?|scars?|uneven (skin )?tone|spots?)\b/],
  ["pores", /\b(pores?|blackheads?)\b/],
  ["texture", /\b(texture|rough|bumpy|bumps?|uneven skin)\b/],
  ["redness", /\b(redness|rosacea|red patches|flushing|irritation|irritated)\b/],
  ["dark-circles", /\b(dark circles?|under[- ]?eye)\b/],
  ["eye-bags", /\b(eye ?bags?|puffy|puffiness)\b/],
  ["hydration", /\b(dry(ness)?|dehydrat\w*|tight|flaky|flaking|hydrat\w*|moisture)\b/],
  ["anti-aging", /\b(anti[- ]?ag(e)?ing|ageing|aging|anti age)\b/],
  ["wrinkles", /\b(wrinkles?|fine lines?|crow'?s feet)\b/],
  ["firmness", /\b(firmness|firming|sagging|saggy|loose skin|elasticity)\b/],
  ["oiliness", /\b(oily|oiliness|greasy|shiny|shine|sebum|excess oil)\b/],
  ["brightening", /\b(dull(ness)?|brighten\w*|glow|radiance|tan(ned)?|tanning)\b/],
];

export const EMERGENCY = /\b(bleed(ing)?|pus|infect(ed|ion)|swollen|swelling|blisters?|open wound|severe pain|very painful|allergic reaction|anaphyla\w*|can'?t breathe|hives|fever|mole\b.*\b(chang\w*|grow\w*|bleed\w*)|melanoma|skin cancer)\b/;

const STRONG_ACTIVES = /retinol|retinal|retinoid|tretinoin|glycolic|salicylic|lactic|mandelic|\baha\b|\bbha\b|benzoyl|azelaic|vitamin c|ascorbic/i;
export const hasStrongActive = (product) => (product.ingredients || []).some((i) => STRONG_ACTIVES.test(i));

// ---------------------------------------------------------------- parsers

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const norm = (s) => clean(s).toLowerCase();

export const parseName = (text) => {
  let t = clean(text).replace(/^(hi|hello|hey)[,!. ]+/i, "");
  t = t.replace(/^(my name is|i am|i'm|im|this is|it'?s|call me|name:?)\s+/i, "");
  t = t.replace(/[.!,]+$/, "");
  if (!/^[\p{L}][\p{L} .'-]{0,38}$/u.test(t)) return null;
  const words = t.split(" ").filter(Boolean);
  if (words.length > 4) return null;
  if (/^(hi|hello|hey|yes|no|ok|okay|thanks|help|skip|start|what|why|how)$/i.test(words[0])) return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
};

export const parseSkinType = (text) => {
  const t = norm(text);
  if (/\b(not sure|don'?t know|dont know|no idea|unknown|unsure|idk)\b/.test(t)) return "unknown";
  if (/\bcombination\b|\bcombo\b|\boily and dry\b|\bdry and oily\b|\bt[- ]?zone\b/.test(t)) return "combination";
  const hits = SKIN_TYPES.filter((s) => s !== "unknown" && new RegExp(`\\b${s}\\b`).test(t));
  if (hits.includes("oily") && hits.includes("dry")) return "combination";
  return hits[0] || null;
};

export const parseConcerns = (text, values = []) => {
  const found = new Set(values.filter((v) => CONCERN_CHOICES.includes(v)));
  const t = norm(text);
  if (t && !t.startsWith("cmd:")) for (const [tag, re] of CONCERN_WORDS) if (re.test(t)) found.add(tag);
  return [...found];
};

export const isNone = (text) => /^(none|no concerns?|nothing|nope|no|n\/a|just maintenance|maintenance|skip)\b/.test(norm(text));

const parseYesNo = (text) => {
  const t = norm(text);
  if (/\b(not sure|don'?t know|maybe|sometimes)\b/.test(t)) return "sometimes";
  if (/^(yes|yeah|yep|yup|y|sure|often|easily|definitely|very)\b|\b(burn|sting|react|allerg|irritat\w*|fragrance)\b/.test(t)) return "yes";
  if (/^(no|nope|nah|n|never|rarely|not really|not at all)\b/.test(t)) return "no";
  return null;
};

export const parseAge = (text) => {
  const t = norm(text);
  const band = AGE_BANDS.find((b) => t === b || t === `age:${b}`);
  if (band) return band;
  const m = t.match(/\b(\d{1,2})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 10 || n > 99) return null;
  if (n < 18) return "under-18";
  if (n < 25) return "18-24";
  if (n < 35) return "25-34";
  if (n < 45) return "35-44";
  if (n < 55) return "45-54";
  return "55-plus";
};

// Budget for the whole routine, in rupees. "0" means no limit.
export const parseBudget = (text) => {
  const t = norm(text).replace(/,/g, "");
  if (/\b(no limit|any|unlimited|flexible|no budget|doesn'?t matter|not fixed)\b/.test(t)) return "0";
  const m = t.match(/(\d+(?:\.\d+)?)\s*(k|thousand)?/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * (m[2] ? 1000 : 1));
  return n >= 100 ? String(n) : n === 0 ? "0" : null;
};

export const parseEmail = (text) => {
  const m = clean(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m && m[0].length <= 120 ? m[0].toLowerCase() : null;
};

export const parsePhone = (text) => {
  const digits = clean(text).replace(/(?<=\d)[\s().-]+(?=\d)/g, "").match(/\+?\d{10,13}/);
  if (!digits) return null;
  const d = digits[0].replace(/^\+/, "");
  const national = d.length > 10 ? d.slice(-10) : d;
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
};

// ------------------------------------------------------------------ Q&A

const rx = (s) => new RegExp(s, "i");
const FAQ = [
  {
    id: "acne",
    match: rx("\\b(acne|pimples?|zits?|break ?outs?)\\b"),
    answer:
      "For acne, keep it simple: a gentle cleanser twice a day, a salicylic-acid or niacinamide product to calm oil and clogged pores, a light non-comedogenic moisturizer, and sunscreen every morning. Don't pick or over-scrub — that causes marks and more breakouts. Results take 6–8 weeks. If it's painful, cystic or leaves scars, please see a dermatologist.",
  },
  {
    id: "dark-spots",
    match: rx("\\b(dark spots?|pigmentation|melasma|marks|scars?|uneven tone)\\b"),
    answer:
      "Dark spots fade with consistency: vitamin C or niacinamide in the morning, a gentle exfoliating acid or retinol at night (a few nights a week), and — most important — SPF 30+ daily, because sun darkens spots again. Expect visible change in 8–12 weeks.",
  },
  {
    id: "dry",
    match: rx("\\b(dry|dryness|dehydrated|flaky|tight skin)\\b"),
    answer:
      "Dry or tight skin needs a gentle non-foaming cleanser, hyaluronic acid on damp skin, and a ceramide-rich moisturizer to lock it in. Skip hot water and harsh scrubs. Remember: dry skin lacks oil, dehydrated skin lacks water — you can have both.",
  },
  {
    id: "oily",
    match: rx("\\b(oily|greasy|shiny|excess oil|sebum)\\b"),
    answer:
      "Oily skin still needs moisture — skipping it makes skin produce more oil. Use a gel cleanser, niacinamide to balance oil and tighten the look of pores, a light gel moisturizer and a matte or gel sunscreen.",
  },
  {
    id: "sensitive",
    match: rx("\\b(sensitive|irritat\\w+|stings?|burns?|rosacea|redness)\\b"),
    answer:
      "For sensitive or red skin: fragrance-free products, a short routine, and one new product at a time. Look for ceramides, centella and panthenol, and always patch-test on your jawline for 24 hours. Avoid strong acids and retinol until your barrier feels calm.",
  },
  {
    id: "sunscreen",
    match: rx("\\b(sunscreen|spf|sun ?block|sun protection)\\b"),
    answer:
      "Sunscreen is the single most important anti-aging and anti-spot step. Use SPF 30–50, broad-spectrum, about two finger-lengths for face and neck, every morning — even indoors or when it's cloudy — and reapply every 2–3 hours in direct sun.",
  },
  {
    id: "routine",
    match: rx("\\b(routine|order|steps?|layer(ing)?|what (do i|should i) (use|apply) first)\\b"),
    answer:
      "A good order is: Morning — cleanser → serum → moisturizer → sunscreen. Night — cleanser → treatment/serum → moisturizer. Thinnest texture first, thickest last. Start with 3 basics (cleanser, moisturizer, sunscreen) and add one active at a time.",
  },
  {
    id: "retinol",
    match: rx("\\b(retinol|retinoid|retinal|tretinoin|vitamin a)\\b"),
    answer:
      "Retinol boosts cell turnover, fading spots, texture and fine lines. Start with a low strength 2 nights a week, use a pea-sized amount, moisturize after, always wear SPF next day, and don't use it while pregnant or breastfeeding. Mild dryness in the first weeks is normal.",
  },
  {
    id: "niacinamide",
    match: rx("\\bniacinamide\\b"),
    answer:
      "Niacinamide (vitamin B3) is a gentle all-rounder: it balances oil, minimizes the look of pores, calms redness and helps fade spots. 5–10% suits most skin types and it pairs well with almost everything, morning or night.",
  },
  {
    id: "vitamin-c",
    match: rx("\\b(vitamin c|ascorbic)\\b"),
    answer:
      "Vitamin C is an antioxidant that brightens skin and fades dark spots. Use it in the morning under sunscreen, store it away from light and heat, and if it tingles too much, start with a lower strength every other day.",
  },
  {
    id: "hyaluronic",
    match: rx("\\b(hyaluronic|hydrating serum)\\b"),
    answer:
      "Hyaluronic acid pulls water into the skin for a plump, hydrated look. Apply it to slightly damp skin and seal it with a moisturizer. It suits every skin type, including oily and acne-prone.",
  },
  {
    id: "exfoliate",
    match: rx("\\b(exfoliat\\w*|aha|bha|salicylic|glycolic|scrub|peel)\\b"),
    answer:
      "Exfoliate 1–3 times a week, not daily. Chemical exfoliants (salicylic/BHA for oil and pores, glycolic/lactic/AHA for dullness and texture) are gentler and more even than physical scrubs. Skip it if your skin is sunburnt or irritated.",
  },
  {
    id: "dark-circles",
    match: rx("\\b(dark circles?|under[- ]?eye|eye ?bags?|puffy)\\b"),
    answer:
      "Dark circles come from genetics, thin skin, poor sleep and sun. An eye cream with caffeine (for puffiness) or vitamin C/niacinamide (for darkness), 7–8 hours of sleep and daily SPF help. Deep hollows are structural and won't fully fade with creams.",
  },
  {
    id: "pores",
    match: rx("\\b(pores?|blackheads?)\\b"),
    answer:
      "Pore size is mostly genetic, but you can make them look smaller: keep them clear with salicylic acid, balance oil with niacinamide, and use sunscreen (sun damage stretches pores). Never squeeze blackheads.",
  },
  {
    id: "aging",
    match: rx("\\b(wrinkles?|fine lines?|aging|ageing|anti[- ]?ag\\w+|firmness|sagging)\\b"),
    answer:
      "For fine lines and firmness: daily sunscreen (non-negotiable), retinol at night, antioxidants like vitamin C in the morning, and peptides or ceramides in your moisturizer. Prevention starts in your mid-20s but it's never too late to improve.",
  },
  {
    id: "patch-test",
    match: rx("\\bpatch ?test\\b"),
    answer:
      "To patch-test: apply a small amount behind your ear or on your jawline once a day for 2–3 days. If there's no redness, itching or burning, it's safe to use on your face.",
  },
  {
    id: "results",
    match: rx("\\b(how long|how soon|when will).*(result|work|see|improve|show)\\b|\\bresults?\\b"),
    answer:
      "Skin renews roughly every 28 days, so give any new routine 6–8 weeks before judging it (hydration improves sooner, spots and lines take 8–12 weeks). Change one product at a time so you know what's working.",
  },
  {
    id: "pregnancy",
    match: rx("\\b(pregnan\\w*|breastfeed\\w*|nursing)\\b"),
    answer:
      "During pregnancy or breastfeeding, avoid retinoids and high-strength salicylic acid. Gentle cleansers, moisturizers, mineral sunscreen, niacinamide and hyaluronic acid are generally fine — but please check your routine with your doctor.",
  },
  {
    id: "scan",
    match: rx("\\b(skin scan|scan|credits?|analy[sz]e my (skin|face)|ai (scan|analysis))\\b"),
    answer:
      "Our Skin Scan analyses a selfie with AI and scores concerns like spots, pores, redness, wrinkles and hydration, then builds a personalised routine. You can buy scan credits on the Pricing page; Quick Scan may be free right now. Open it from “Skin Scan” in the menu.",
  },
  {
    id: "shipping",
    match: rx("\\b(shipping|delivery|deliver|dispatch|how long.*(arrive|reach)|track(ing)?)\\b"),
    answer:
      "Orders are shipped after checkout and you can follow them from “Orders” in your account. For the exact delivery time to your pincode or a tracking problem, please contact our team (Contact page) with your order number.",
  },
  {
    id: "returns",
    match: rx("\\b(return|refund|exchange|cancel(lation)?)\\b"),
    answer:
      "You can read our full policy on the Refund Policy page (footer). For a specific order or payment, please contact our team with your order number and we'll help.",
  },
  {
    id: "payment",
    match: rx("\\b(payment|pay|upi|card|razorpay|cod|cash on delivery)\\b"),
    answer:
      "Payments are handled securely by Razorpay — UPI, cards, netbanking and wallets. Card details never touch our servers. If a payment was deducted but not confirmed, contact our team with the payment reference.",
  },
  {
    id: "who",
    match: rx("\\b(who are you|are you (a )?(bot|human|real|ai)|your name)\\b"),
    answer:
      "I'm the DXB BEAUTY skin assistant — an automated guide, not a doctor. I can build a routine from our products and answer everyday skin-care questions. For medical skin problems please see a dermatologist.",
  },
];

const THANKS = /\b(thanks|thank you|thx|ty|great|awesome|perfect)\b/;
const BYE = /\b(bye|goodbye|see you|that'?s all)\b/;
const GREETING = /^(hi+|hello+|hey+|hola|namaste|good (morning|afternoon|evening)|yo)\b/;
const HUMAN = /\b(human|agent|person|someone|support|talk to (a |the )?(team|staff)|call me|customer care|complaint)\b/;
const RESTART = /\b(start over|restart|reset|begin again|new chat)\b/;
const PRODUCTS = /\b(recommend|suggest|show|products?|picks?|routine for me|what should i (buy|use))\b/;

export const answerFaq = (text) => {
  const t = norm(text);
  return FAQ.find((f) => f.match.test(t)) || null;
};

const looksLikeQuestion = (text) => {
  const t = norm(text);
  return t.includes("?") || /^(what|why|how|can|could|should|does|do|is|are|which|when|where|will|tell me|explain)\b/.test(t);
};

// ----------------------------------------------------------------- prompts

const reply = (text, quick = [], extra = {}) => ({ text, quick, ...extra });
const q = (label, value = label) => ({ label, value });

const PROMPTS = {
  name: () => reply("What should I call you?", [], { input: "text", placeholder: "Your first name" }),
  skinType: (s) =>
    reply(
      `Nice to meet you, ${s.name}! 😊 Let's find the right products for you. What's your skin type?`,
      [q("Oily", "oily"), q("Dry", "dry"), q("Combination", "combination"), q("Sensitive", "sensitive"), q("Normal", "normal"), q("Not sure", "unknown")]
    ),
  concerns: () =>
    reply(
      "What would you like to improve? Pick all that apply, then tap Done — or just type it in your own words.",
      CONCERN_CHOICES.map((c) => q(CONCERN_LABEL[c], c)),
      { input: "multi", placeholder: "e.g. pimples and dark spots" }
    ),
  sensitivity: () =>
    reply("Does your skin react easily — stinging, burning or redness with new products?", [q("Yes, easily", "yes"), q("Sometimes", "sometimes"), q("No", "no")]),
  age: () =>
    reply("Which age group are you in? This helps me pick the right strength.", [
      q("Under 18", "under-18"), q("18–24", "18-24"), q("25–34", "25-34"), q("35–44", "35-44"), q("45–54", "45-54"), q("55+", "55-plus"),
    ]),
  budget: () =>
    reply("What's your budget for the whole routine?", [q("Under ₹1,000", "1000"), q("Up to ₹2,500", "2500"), q("Up to ₹5,000", "5000"), q("No limit", "0")], {
      input: "text",
      placeholder: "or type an amount, e.g. 1800",
    }),
  contact: (s, profile) =>
    profile?.email
      ? reply(
          `I can send your picks and let our skin team follow up using ${profile.email}${profile.phone ? ` / ${profile.phone}` : ""} from your account. Is that OK?`,
          [q("Yes, use these", "use-account"), q("Use another email", "other"), q("Skip", "skip")]
        )
      : reply(
          "Last step — share your email (or phone) and I'll keep your picks and our skin team can follow up with advice. It's only used for that. You can also skip.",
          [q("Skip", "skip")],
          { input: "text", placeholder: "you@example.com or 98XXXXXX10" }
        ),
  phone: () =>
    reply("Thanks! Want to add a phone number too? (optional)", [q("No thanks", "skip")], { input: "text", placeholder: "10-digit mobile number" }),
};

const MENU = () => [q("See my picks", "cmd:picks"), q("Ask a skin question", "cmd:ask"), q("Start over", "cmd:restart"), q("Talk to our team", "cmd:human")];

const STEP_ERROR = {
  name: "Sorry, I didn't catch that — what's your first name?",
  skinType: "I didn't quite get your skin type. Is it oily, dry, combination, sensitive or normal? (Pick “Not sure” if you don't know — I'll still help.)",
  concerns: "I couldn't match that to a concern. Try words like acne, dark spots, dryness, wrinkles, pores or dullness — or tap the options. Say “none” if you only want maintenance.",
  sensitivity: "Does your skin react easily to new products? Yes, sometimes or no is fine.",
  age: "Could you tell me your age or pick a group?",
  budget: "Please tap a budget or type an amount in rupees (like 1500), or say “no limit”.",
  contact: "That doesn't look like a valid email or phone number. Try again, or tap Skip.",
  phone: "That doesn't look like a valid Indian mobile number. Try again, or tap No thanks.",
};

const SAFETY_NOTE =
  "⚠️ What you describe may need a doctor — please see a dermatologist soon rather than treating it with products. I'm not able to diagnose skin conditions.";

export const initialState = (profile = {}) => {
  const name = profile.name ? parseName(profile.name.split(" ")[0]) : null;
  return {
    step: name ? "skinType" : "name",
    name,
    skinType: null,
    concerns: [],
    sensitive: null,
    ageBand: null,
    budget: null,
    email: null,
    phone: null,
    consent: false,
    fails: 0,
    done: false,
    flaggedMedical: false,
  };
};

export const greeting = (state) => {
  const hi = state.name
    ? `Hi ${state.name}! 👋 I'm the DXB BEAUTY skin assistant. I'll ask a few quick questions and recommend products that suit your skin.`
    : "Hi! 👋 I'm the DXB BEAUTY skin assistant. I'll ask a few quick questions and recommend products that suit your skin. I'm not a doctor, so for medical skin problems please see a dermatologist.";
  return { replies: [reply(hi), PROMPTS[state.step](state)] };
};

// ---------------------------------------------------------------- the turn

// The step after the current one. Someone who already said their skin is
// sensitive isn't asked again.
const advance = (state) => {
  let next = STEPS[STEPS.indexOf(state.step) + 1];
  if (next === "sensitivity" && state.sensitive) next = STEPS[STEPS.indexOf(next) + 1];
  return next;
};

/**
 * @param state    saved conversation state (see initialState)
 * @param input    { text, values } — values is a list of chosen concern tags
 * @param profile  { name, email, phone, skinType } of the signed-in user, if any
 * @returns { state, replies: [{ text, quick, input?, placeholder? }], recommend: boolean }
 */
export const handleTurn = (prevState, input = {}, profile = {}) => {
  const state = { ...prevState, concerns: [...(prevState.concerns || [])] };
  const text = clean(input.text).slice(0, 500);
  const values = Array.isArray(input.values) ? input.values.map(String).slice(0, 20) : [];
  const t = norm(text);
  const out = { state, replies: [], recommend: false };
  const say = (...r) => out.replies.push(...r);
  const reask = () => say(PROMPTS[state.step]?.(state, profile));

  // Commands from the quick-reply buttons.
  if (t === "cmd:restart" || RESTART.test(t)) {
    const fresh = initialState(profile);
    out.state = fresh;
    say(reply("No problem — let's start fresh."), PROMPTS[fresh.step](fresh, profile));
    return out;
  }
  if (t === "cmd:picks" || (state.done && PRODUCTS.test(t))) {
    if (!state.done) {
      say(reply("I'll need a few answers first so my picks fit you."));
      reask();
    } else out.recommend = true;
    return out;
  }
  if (t === "cmd:ask") {
    say(reply("Sure — ask me anything about acne, dryness, sunscreen, retinol, routines, pores, dark spots and more.", MENU()));
    return out;
  }
  if (t === "cmd:human" || HUMAN.test(t)) {
    say(
      reply(
        "I'm an automated assistant, but our team is happy to help. Please use the Contact page (link in the footer) and share your order number if it's about an order — we'll get back to you.",
        state.done ? MENU() : []
      )
    );
    if (!state.done) reask();
    return out;
  }

  // Safety first: describe a medical red flag → recommend a doctor.
  if (EMERGENCY.test(t)) {
    state.flaggedMedical = true;
    say(reply(SAFETY_NOTE));
    if (!state.done) reask();
    else say(reply("I can still suggest gentle everyday products if you like.", MENU()));
    return out;
  }

  const faqTurn = () => {
    const faq = answerFaq(text);
    if (!faq) return false;
    say(reply(faq.answer));
    if (state.done) say(reply("Anything else I can help with?", MENU()));
    else {
      say(reply("Now, back to your profile 👇"));
      reask();
    }
    return true;
  };

  // Finished interview: open conversation.
  if (state.done) {
    if (faqTurn()) return out;
    if (THANKS.test(t)) say(reply("You're welcome! 💙 Anything else I can help with?", MENU()));
    else if (BYE.test(t)) say(reply("Take care, and don't forget your sunscreen! ☀️", MENU()));
    else if (GREETING.test(t)) say(reply(`Hi again${state.name ? `, ${state.name}` : ""}! What would you like to do?`, MENU()));
    else say(reply("I can show your picks again, answer a skin-care question, or connect you with our team.", MENU()));
    return out;
  }

  // Greeting mid-interview.
  if (GREETING.test(t) && t.split(" ").length <= 3 && state.step !== "name") {
    say(reply("Hi! 😊 Let's carry on."));
    reask();
    return out;
  }

  // A real question at the name step is a question, not a name.
  if (looksLikeQuestion(text) && state.step === "name" && faqTurn()) return out;

  const ok = (nextPrefix) => {
    state.fails = 0;
    if (nextPrefix) say(reply(nextPrefix));
    const next = advance(state);
    if (next) {
      state.step = next;
      reask();
    } else finish();
  };

  const finish = () => {
    state.done = true;
    state.step = "done";
    out.recommend = true;
  };

  const fail = () => {
    if (faqTurn()) return;
    state.fails += 1;
    say(reply(STEP_ERROR[state.step]));
    reask();
  };

  switch (state.step) {
    case "name": {
      const name = parseName(text);
      if (!name) {
        if (GREETING.test(t)) {
          say(reply("Hello! 👋"));
          reask();
        } else fail();
        break;
      }
      state.name = name;
      ok();
      break;
    }
    case "skinType": {
      const skin = parseSkinType(t.replace(/^skin:/, ""));
      if (!skin) return fail(), out;
      state.skinType = skin;
      if (skin === "sensitive") state.sensitive = true;
      ok(skin === "unknown" ? "No worries — I'll choose products that suit most skin types." : null);
      break;
    }
    case "concerns": {
      const found = parseConcerns(text, values);
      if (!found.length && !isNone(text) && !values.includes("none")) return fail(), out;
      state.concerns = found;
      const nice = found.map((c) => CONCERN_LABEL[c].toLowerCase()).join(", ");
      ok(found.length ? `Got it — ${nice}.` : "Okay, I'll build a simple maintenance routine.");
      break;
    }
    case "sensitivity": {
      const yn = parseYesNo(text);
      if (!yn) return fail(), out;
      state.sensitive = yn === "no" ? state.skinType === "sensitive" : true;
      ok(state.sensitive ? "Thanks — I'll avoid harsh actives and favour gentle formulas." : null);
      break;
    }
    case "age": {
      const band = parseAge(t);
      if (!band) return fail(), out;
      state.ageBand = band;
      if (band === "under-18") {
        state.sensitive = true;
        ok("Thanks! For under-18 skin I'll keep it to gentle basics. (Please check with a parent or doctor before trying new actives.)");
      } else ok();
      break;
    }
    case "budget": {
      const b = parseBudget(t.replace(/^budget:/, ""));
      if (b === null) return fail(), out;
      state.budget = b;
      ok();
      break;
    }
    case "contact": {
      if (t === "skip" || /^(no|no thanks|not now|later)$/.test(t)) {
        state.fails = 0;
        say(reply("No problem — you can still see all your picks."));
        finish();
        break;
      }
      if (t === "use-account" && profile.email) {
        state.email = profile.email;
        state.phone = profile.phone || null;
        state.consent = true;
        state.fails = 0;
        say(reply("Saved — thank you!"));
        finish();
        break;
      }
      if (t === "other") {
        say(reply("Sure — type the email or phone number you'd like me to use.", [q("Skip", "skip")], { input: "text", placeholder: "you@example.com or 98XXXXXX10" }));
        break;
      }
      const email = parseEmail(text);
      const phone = parsePhone(text);
      if (!email && !phone) return fail(), out;
      state.consent = true;
      if (email) state.email = email;
      if (phone) state.phone = phone;
      state.fails = 0;
      if (email && !phone) {
        state.step = "phone";
        reask();
      } else {
        say(reply("Saved — thank you!"));
        finish();
      }
      break;
    }
    case "phone": {
      if (t === "skip" || /^(no|no thanks|not now|later)$/.test(t)) {
        finish();
        break;
      }
      const phone = parsePhone(text);
      if (!phone) return fail(), out;
      state.phone = phone;
      say(reply("Saved — thank you!"));
      finish();
      break;
    }
    default:
      Object.assign(state, initialState(profile));
      reask();
  }
  return out;
};

export const concernLabel = (tag) => CONCERN_LABEL[tag] || tag;
