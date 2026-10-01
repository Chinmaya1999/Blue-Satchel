import jwt from "jsonwebtoken";
import ChatLead from "../models/ChatLead.js";
import User from "../models/User.js";
import { initialState, greeting, handleTurn } from "../services/chatbot.js";
import { buildRoutine } from "../services/chatRecommend.js";

const SESSION_ID = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_MESSAGES = 80;

// The chat is open to visitors; a valid token just lets it use the account's
// name and contact details.
const optionalUser = async (req) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
};

const profileOf = (user) =>
  user ? { name: user.name, email: user.emailVerified === false ? null : user.email, phone: user.phone, skinType: user.skinType } : {};

const log = (lead, role, text) => {
  if (text) lead.messages.push({ role, text: String(text).slice(0, 600) });
  if (lead.messages.length > MAX_MESSAGES) lead.messages.splice(0, lead.messages.length - MAX_MESSAGES);
};

// Copies what the visitor has shared so far onto the lead's readable fields.
const syncLead = (lead, state) => {
  lead.state = state;
  lead.markModified("state");
  Object.assign(lead, {
    name: state.name || lead.name,
    skinType: state.skinType || lead.skinType,
    concerns: state.concerns || [],
    sensitive: state.sensitive ?? lead.sensitive,
    ageBand: state.ageBand || lead.ageBand,
    budget: state.budget ?? lead.budget,
    completed: Boolean(state.done),
    needsDermatologist: lead.needsDermatologist || Boolean(state.flaggedMedical),
  });
  if (state.consent) {
    lead.contactConsent = true;
    if (state.email) lead.email = state.email;
    if (state.phone) lead.phone = state.phone;
  }
};

const present = (replies, state, extra = {}) => {
  const last = replies[replies.length - 1] || {};
  return {
    messages: replies.map((r) => ({ text: r.text })),
    quickReplies: last.quick || [],
    input: last.input || "text",
    placeholder: last.placeholder || "Type your message…",
    done: Boolean(state.done),
    ...extra,
  };
};

// Builds the final reply messages: the picks, notes and a menu.
const withRecommendations = async (lead, state, replies) => {
  const routine = await buildRoutine(state);
  if (!routine.products.length) {
    replies.push({
      text: "I couldn't find a matching product in stock right now. Our team can help you personally — please use the Contact page.",
      quick: [],
    });
    return { routine: null };
  }
  lead.recommended = routine.products.map((p) => p._id);
  const intro = `${state.name ? `${state.name}, here` : "Here"} is your routine${routine.summary ? ` for ${routine.summary}` : ""}${
    state.skinType && state.skinType !== "unknown" ? ` on ${state.skinType} skin` : ""
  } — ${routine.products.length} products, ₹${routine.total} in total:`;
  replies.push({ text: intro, quick: [] });
  for (const note of routine.notes) replies.push({ text: note, quick: [] });
  replies.push({
    text: "Tip: introduce one new product at a time, patch-test first, and use sunscreen every morning. Want to ask me anything?",
    quick: [
      { label: "Ask a skin question", value: "cmd:ask" },
      { label: "Start over", value: "cmd:restart" },
      { label: "Talk to our team", value: "cmd:human" },
    ],
  });
  return { routine };
};

const loadLead = async (sessionId, user) => {
  let lead = await ChatLead.findOne({ sessionId });
  let created = false;
  if (!lead) {
    lead = new ChatLead({ sessionId, user: user?._id, state: initialState(profileOf(user)) });
    created = true;
  } else if (user && !lead.user) lead.user = user._id;
  return { lead, created };
};

// Start (or resume) a conversation.
export const startChat = async (req, res, next) => {
  try {
    const sessionId = String(req.body.sessionId || "");
    if (!SESSION_ID.test(sessionId)) return res.status(400).json({ message: "Invalid chat session." });
    const user = await optionalUser(req);
    const { lead, created } = await loadLead(sessionId, user);

    if (!created && lead.messages.length) {
      // Resume: replay the saved transcript.
      const resumed = lead.messages.map((m) => ({ role: m.role, text: m.text }));
      const state = lead.state;
      const last = state.done ? null : greeting(state).replies.pop();
      await lead.save();
      return res.json({
        resumed,
        ...present(last ? [last] : [], state),
        quickReplies: last?.quick || [],
        done: Boolean(state.done),
      });
    }

    const { replies } = greeting(lead.state);
    replies.forEach((r) => log(lead, "bot", r.text));
    await lead.save();
    res.json(present(replies, lead.state));
  } catch (err) {
    next(err);
  }
};

// One visitor message in, the bot's replies (and any product picks) out.
export const sendMessage = async (req, res, next) => {
  try {
    const sessionId = String(req.body.sessionId || "");
    if (!SESSION_ID.test(sessionId)) return res.status(400).json({ message: "Invalid chat session." });
    const text = typeof req.body.text === "string" ? req.body.text : "";
    const values = Array.isArray(req.body.values) ? req.body.values.filter((v) => typeof v === "string").slice(0, 20) : [];
    if (!text.trim() && !values.length) return res.status(400).json({ message: "Please type a message." });

    const user = await optionalUser(req);
    const { lead } = await loadLead(sessionId, user);

    log(lead, "user", typeof req.body.label === "string" && req.body.label ? req.body.label : text || values.join(", "));
    const turn = handleTurn(lead.state, { text, values }, profileOf(user));

    let routine = null;
    if (turn.recommend) ({ routine } = await withRecommendations(lead, turn.state, turn.replies));

    syncLead(lead, turn.state);
    turn.replies.forEach((r) => log(lead, "bot", r.text));
    await lead.save();

    res.json(present(turn.replies, turn.state, routine ? { products: routine.products, total: routine.total } : {}));
  } catch (err) {
    next(err);
  }
};

// Admin: the leads the chatbot has collected.
export const listChatLeads = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 25;
    const filter = {};
    if (req.query.contact === "1") filter.contactConsent = true;
    if (req.query.completed === "1") filter.completed = true;
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const re = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }
    const [leads, total] = await Promise.all([
      ChatLead.find(filter, "-state")
        .populate("recommended", "name price category")
        .populate("user", "name email")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ChatLead.countDocuments(filter),
    ]);
    res.json({ leads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
