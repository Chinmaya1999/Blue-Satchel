import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { crmService } from "../services/crmService.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const user = await User.create({ name, email, password, phone });

    const remoteId = await crmService.syncCustomer(user);
    user.crmContactId = remoteId;
    user.notifications.push({
      title: "Welcome to Blue Satchel",
      message: "Your account is ready. Take your first AI skin scan to get personalized recommendations.",
    });
    await user.save();

    res.status(201).json({ user: user.toSafeObject(), token: generateToken(user._id, user.role) });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({ user: user.toSafeObject(), token: generateToken(user._id, user.role) });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

export const updateMe = async (req, res, next) => {
  try {
    const allowed = ["name", "phone", "skinType", "dateOfBirth", "address", "avatarUrl"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) req.user[key] = req.body[key];
    }
    await req.user.save();
    await crmService.syncCustomer(req.user);
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notif = req.user.notifications.id(req.params.id);
    if (!notif) return res.status(404).json({ message: "Notification not found." });
    notif.read = true;
    await req.user.save();
    res.json({ notifications: req.user.notifications });
  } catch (err) {
    next(err);
  }
};
