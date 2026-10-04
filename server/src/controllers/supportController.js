import SupportThread from "../models/SupportThread.js";
import User from "../models/User.js";

// Live chat between customers and the DXB BEAUTY team. The browser polls
// these endpoints (no websocket server to run), asking only for messages it
// hasn't seen yet via `after` = how many it already has.

const MAX_LEN = 2000;
const MAX_MESSAGES = 1000; // oldest drop off past this

const cleanText = (v) => (typeof v === "string" ? v.trim().slice(0, MAX_LEN) : "");
const preview = (t) => (t.length > 120 ? `${t.slice(0, 117)}…` : t);

// Thread as the browser needs it: only the messages after the first `after`.
const view = (thread, after = 0, extra = {}) => ({
  id: thread._id,
  status: thread.status,
  total: thread.messages.length,
  messages: thread.messages.slice(Math.max(0, after)).map((m) => ({
    id: m._id, sender: m.sender, text: m.text, createdAt: m.createdAt,
  })),
  ...extra,
});

const afterOf = (req) => Math.max(0, parseInt(req.query.after, 10) || 0);
// When sending, return everything since the sender's last poll (default: just their own message).
const afterSend = (req, thread) =>
  req.query.after !== undefined ? afterOf(req) : Math.max(0, thread.messages.length - 1);

// ───────── Customer ─────────

export const getMyThread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findOne({ user: req.user._id });
    if (!thread) return res.json({ id: null, status: "open", total: 0, messages: [], unread: 0 });
    // Opening the chat counts as reading the team's replies.
    const unread = thread.unreadForUser;
    if (unread && req.query.markRead !== "0") {
      await SupportThread.updateOne({ _id: thread._id }, { unreadForUser: 0 });
    }
    res.json(view(thread, afterOf(req), { unread: req.query.markRead === "0" ? unread : 0 }));
  } catch (err) {
    next(err);
  }
};

// Cheap check for the chat badge: does the team have unread replies for me?
export const getMyUnread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findOne({ user: req.user._id }).select("unreadForUser");
    res.json({ unread: thread?.unreadForUser || 0 });
  } catch (err) {
    next(err);
  }
};

export const sendMyMessage = async (req, res, next) => {
  try {
    const text = cleanText(req.body.text);
    if (!text) return res.status(400).json({ message: "Please type a message." });
    const thread = await SupportThread.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: { messages: { $each: [{ sender: "user", text }], $slice: -MAX_MESSAGES } },
        $inc: { unreadForAdmin: 1 },
        $set: { status: "open", lastMessageAt: new Date(), lastMessageText: preview(text), lastSender: "user" },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(view(thread, afterSend(req, thread)));
  } catch (err) {
    next(err);
  }
};

// ───────── Admin ─────────

// For the bell: how many customers are waiting, and the newest waiting one.
export const adminUnread = async (req, res, next) => {
  try {
    const waiting = await SupportThread.find({ unreadForAdmin: { $gt: 0 } })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .populate("user", "name");
    res.json({
      count: await SupportThread.countDocuments({ unreadForAdmin: { $gt: 0 } }),
      messages: waiting.reduce((n, t) => n + t.unreadForAdmin, 0),
      latest: waiting.map((t) => ({ id: t._id, name: t.user?.name || "Customer", text: t.lastMessageText, at: t.lastMessageAt, unread: t.unreadForAdmin })),
    });
  } catch (err) {
    next(err);
  }
};

export const adminListThreads = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status === "open" || req.query.status === "closed") filter.status = req.query.status;
    if (req.query.unread === "1") filter.unreadForAdmin = { $gt: 0 };
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60), "i");
      const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select("_id").limit(100);
      filter.user = { $in: users.map((u) => u._id) };
    }
    const threads = await SupportThread.find(filter)
      .select("-messages")
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .populate("user", "name email phone");
    res.json({
      threads: threads
        .filter((t) => t.user) // customer account was deleted
        .map((t) => ({
          id: t._id, status: t.status, user: t.user, unread: t.unreadForAdmin,
          lastMessageText: t.lastMessageText, lastMessageAt: t.lastMessageAt, lastSender: t.lastSender,
        })),
    });
  } catch (err) {
    next(err);
  }
};

export const adminGetThread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findById(req.params.id).populate("user", "name email phone skinType credits");
    if (!thread) return res.status(404).json({ message: "Conversation not found." });
    if (thread.unreadForAdmin) await SupportThread.updateOne({ _id: thread._id }, { unreadForAdmin: 0 });
    res.json(view(thread, afterOf(req), { user: thread.user }));
  } catch (err) {
    next(err);
  }
};

export const adminReply = async (req, res, next) => {
  try {
    const text = cleanText(req.body.text);
    if (!text) return res.status(400).json({ message: "Please type a reply." });
    const thread = await SupportThread.findByIdAndUpdate(
      req.params.id,
      {
        $push: { messages: { $each: [{ sender: "admin", text, admin: req.user._id }], $slice: -MAX_MESSAGES } },
        $inc: { unreadForUser: 1 },
        $set: { status: "open", unreadForAdmin: 0, lastMessageAt: new Date(), lastMessageText: preview(text), lastSender: "admin" },
      },
      { new: true }
    );
    if (!thread) return res.status(404).json({ message: "Conversation not found." });
    await User.updateOne(
      { _id: thread.user },
      { $push: { notifications: { title: "Reply from the DXB BEAUTY team", message: preview(text) } } }
    );
    res.status(201).json(view(thread, afterSend(req, thread)));
  } catch (err) {
    next(err);
  }
};

export const adminSetStatus = async (req, res, next) => {
  try {
    if (!["open", "closed"].includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
    const thread = await SupportThread.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select("-messages");
    if (!thread) return res.status(404).json({ message: "Conversation not found." });
    res.json({ id: thread._id, status: thread.status });
  } catch (err) {
    next(err);
  }
};
