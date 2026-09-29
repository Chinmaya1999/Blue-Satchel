import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { crmService } from "../services/crmService.js";
import { resolveSignupLocation } from "../services/geoService.js";

const welcome = async (user) => {
  user.crmContactId = await crmService.syncCustomer(user);
  user.notifications.push({
    title: "Welcome to Blue Satchel",
    message: "Your account is ready. Take your first AI skin scan to get personalized recommendations.",
  });
  await user.save();
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, location } = req.body;
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Name, email, phone number and password are required." });
    }
    // 10–15 digits (E.164 max), allowing a leading + and spaces/dashes.
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^\+?[\d\s-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
      return res.status(400).json({ message: "Please enter a valid phone number (10–15 digits)." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const signupLocation = await resolveSignupLocation(req, location);
    const user = await User.create({ name, email, password, phone, signupLocation });
    await welcome(user);

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
    if (user && !user.password && user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google." });
    }
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({ user: user.toSafeObject(), token: generateToken(user._id, user.role) });
  } catch (err) {
    next(err);
  }
};

// Public settings the login page needs (Google button is hidden when unset).
export const getAuthConfig = (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
};

/**
 * Sign in / sign up with Google. The client sends the ID token from Google
 * Identity Services; Google's tokeninfo endpoint verifies its signature and
 * expiry, and we check it was issued for our client ID.
 */
export const googleLogin = async (req, res, next) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ message: "Google sign-in isn't configured." });
    const { credential, location } = req.body;
    if (!credential) return res.status(400).json({ message: "Missing Google credential." });

    const verify = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(10000),
    });
    const info = await verify.json();
    if (!verify.ok || info.aud !== clientId || info.email_verified !== "true") {
      return res.status(401).json({ message: "Google sign-in failed. Please try again." });
    }

    const email = info.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: info.sub }, { email }] });
    if (user) {
      // Existing email/password account: link it to this Google identity.
      if (!user.googleId) {
        user.googleId = info.sub;
        if (!user.avatarUrl && info.picture) user.avatarUrl = info.picture;
        await user.save();
      }
    } else {
      user = await User.create({
        name: info.name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId: info.sub,
        avatarUrl: info.picture,
        signupLocation: await resolveSignupLocation(req, location),
      });
      await welcome(user);
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
