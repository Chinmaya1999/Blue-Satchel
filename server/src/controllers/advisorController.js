import ScanHistory from "../models/ScanHistory.js";
import { handleAdvisor, initialAdvisorState } from "../services/scanAdvisor.js";
import { buildRoutine } from "../services/chatRecommend.js";
import { handleKBeauty, initialKState } from "../services/kbeauty.js";
import { koreanPicks } from "../services/kbeautyRecommend.js";

const STEPS = ["goals", "skin", "plan"];
const SKIN = ["oily", "dry", "combination", "normal", "sensitive", "unknown"];

// The client keeps the conversation state between messages; accept only the
// fields and values the engine itself produces.
const cleanState = (raw) => {
  const base = initialAdvisorState();
  if (!raw || typeof raw !== "object") return base;
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.length <= 40).slice(0, 20) : []);
  return {
    ...base,
    step: STEPS.includes(raw.step) ? raw.step : base.step,
    goals: list(raw.goals),
    skinType: SKIN.includes(raw.skinType) ? raw.skinType : null,
    sensitive: typeof raw.sensitive === "boolean" ? raw.sensitive : null,
    planned: raw.planned === true,
    fails: Math.min(Number(raw.fails) || 0, 10),
  };
};

// What the picks are built from: the scan's own scores, with what the
// customer chose to improve boosted so those concerns lead the routine.
const engineConcerns = (scan, goals) =>
  scan.concerns.map((c) => ({
    key: c.key,
    severity: goals.includes(c.key) ? Math.max(c.severity, 70) : Math.round(c.severity * 0.5),
  }));

export const scanAdvisor = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findOne({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ message: "Scan not found." });

    const text = typeof req.body.text === "string" ? req.body.text : "";
    const values = Array.isArray(req.body.values) ? req.body.values.filter((v) => typeof v === "string") : [];
    const init = req.body.init === true;
    if (!init && !text.trim() && !values.length) return res.status(400).json({ message: "Please type a message." });

    const profile = { skinType: req.user.skinType };
    const turn = handleAdvisor(init ? initialAdvisorState() : cleanState(req.body.state), { text, values, init }, { scan, profile });

    let products = null;
    let total = 0;
    if (turn.action === "products") {
      const s = { skinType: turn.state.skinType, sensitive: turn.state.sensitive, concerns: [], ageBand: null, budget: null };
      const routine = await buildRoutine(s, { engineConcerns: engineConcerns(scan, turn.state.goals) });
      products = routine.products;
      total = routine.total;
      if (!products.length) turn.replies.push({ text: "I couldn't find matching products in stock right now.", quick: [] });
      else {
        for (const note of routine.notes) turn.replies.push({ text: note, quick: [] });
        turn.replies.push({
          text: `That's ${products.length} products, ₹${total} in total. Introduce one at a time and patch-test first.`,
          quick: [
            { label: "Find dermatologists near me", value: "cmd:derm" },
            { label: "Ask a skin question", value: "cmd:ask" },
            { label: "Change my answers", value: "cmd:redo" },
          ],
        });
      }
    }

    const last = turn.replies[turn.replies.length - 1] || {};
    res.json({
      state: turn.state,
      messages: turn.replies.map((r) => ({ text: r.text })),
      quickReplies: last.quick || [],
      input: last.input || "text",
      placeholder: last.placeholder || "Type your message…",
      action: turn.action,
      products,
      total,
    });
  } catch (err) {
    next(err);
  }
};

// The K-beauty guide: same conversation shape, Korean products only.
export const scanKBeauty = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findOne({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ message: "Scan not found." });

    const text = typeof req.body.text === "string" ? req.body.text : "";
    const values = Array.isArray(req.body.values) ? req.body.values.filter((v) => typeof v === "string") : [];
    const init = req.body.init === true;
    if (!init && !text.trim() && !values.length) return res.status(400).json({ message: "Please type a message." });

    const turn = handleKBeauty(init ? initialKState() : cleanState(req.body.state), { text, values, init }, { scan, profile: { skinType: req.user.skinType } });

    let products = null;
    let total = 0;
    if (turn.action === "products") {
      ({ products, total } = await koreanPicks(scan, turn.state.goals, turn.state.skinType));
      if (!products.length) {
        turn.replies.push({ text: "I couldn't find a matching Korean product in stock right now — try the Skin Advisor on the left for other picks.", quick: [] });
      } else {
        turn.replies.push({
          text: `${products.length} Korean products, ₹${total} in total. Add one at a time and patch-test first.${
            turn.state.goals.some((g) => ["radiance", "spots", "acne", "pores", "texture", "moisture"].includes(g)) ? " For sunscreen, pick any SPF 30–50 from our shop." : ""
          }`,
          quick: [{ label: "Ask about K-beauty", value: "cmd:ask" }, { label: "Start over", value: "cmd:redo" }],
        });
      }
    }

    const last = turn.replies[turn.replies.length - 1] || {};
    res.json({
      state: turn.state,
      messages: turn.replies.map((r) => ({ text: r.text })),
      quickReplies: last.quick || [],
      input: last.input || "text",
      placeholder: last.placeholder || "Type your message…",
      action: turn.action,
      products,
      total,
    });
  } catch (err) {
    next(err);
  }
};
