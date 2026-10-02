import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { crmService } from "../services/crmService.js";
import { resolveSignupLocation } from "../services/geoService.js";
import {
  issueVerificationCode,
  verifyEmailCode,
  RESEND_COOLDOWN_SECONDS,
  CODE_TTL_MINUTES,
} from "../services/emailVerification.js";
import * as passwordReset from "../services/passwordReset.js";

const welcome = async (user) => {
  user.crmContactId = await crmService.syncCustomer(user);
  user.notifications.push({
    title: "Welcome to Blue Satchel",
    message: "Your account is ready. Take your first AI skin scan to get personalized recommendations.",
  });
  await user.save();
};

const str = (v) => (typeof v === "string" ? v.trim() : "");
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const register = async (req, res, next) => {
  try {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const phone = str(req.body.phone);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const { location } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Name, email, phone number and password are required." });
    }
    if (name.length > 80) return res.status(400).json({ message: "Name is too long." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    // Any country: 7–15 digits (E.164 max), allowing a leading + and spaces/dashes.
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^\+?[\d\s-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({ message: "Please enter a valid phone number with country code (7–15 digits)." });
    }
    // bcrypt only reads the first 72 bytes, so cap it there.
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({ message: "Password must be 6–72 characters." });
    }
    const signupLocation = await resolveSignupLocation(req, location);
    const existing = await User.findOne({ email });
    let user;
    if (existing && existing.emailVerified === false && existing.authProvider === "local") {
      // Never-verified sign-up for this email (a typo'd retry, or someone who
      // entered an address they don't own). It could do nothing without
      // verifying, so the new sign-up replaces it and gets a fresh code.
      Object.assign(existing, { name, password, phone, signupLocation });
      user = await existing.save();
    } else if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    } else {
      user = await User.create({ name, email, password, phone, signupLocation, emailVerified: false });
      await welcome(user);
    }

    // The account exists either way; if the email fails to send, the verify
    // page lets them request the code again.
    let emailSent = true;
    try {
      await issueVerificationCode(user, { welcome: true });
    } catch (err) {
      emailSent = false;
      console.error("[email] verification code not sent:", err.message);
    }

    res.status(201).json({
      user: user.toSafeObject(),
      token: generateToken(user._id, user.role),
      verification: { emailSent, codeTtlMinutes: CODE_TTL_MINUTES, resendCooldownSeconds: RESEND_COOLDOWN_SECONDS },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email }).select("+password");
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
    const { location } = req.body;
    const credential = str(req.body.credential);
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
      // Google has verified the email, so that also completes verification.
      if (!user.googleId || user.emailVerified === false) {
        user.googleId ??= info.sub;
        if (!user.avatarUrl && info.picture) user.avatarUrl = info.picture;
        user.emailVerified = true;
        user.emailVerification = undefined;
        await user.save();
      }
    } else {
      user = await User.create({
        name: info.name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId: info.sub,
        avatarUrl: info.picture,
        emailVerified: true,
        signupLocation: await resolveSignupLocation(req, location),
      });
      await welcome(user);
    }

    res.json({ user: user.toSafeObject(), token: generateToken(user._id, user.role) });
  } catch (err) {
    next(err);
  }
};

// The 6-digit code from the welcome email.
export const verifyEmail = async (req, res, next) => {
  try {
    const user = await verifyEmailCode(req.user._id, String(req.body.code || "").trim());
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

export const resendVerificationCode = async (req, res, next) => {
  try {
    if (req.user.emailVerified !== false) return res.status(400).json({ message: "Your email is already verified." });
    await issueVerificationCode(req.user);
    res.json({ message: `A new code has been sent to ${req.user.email}.`, resendCooldownSeconds: RESEND_COOLDOWN_SECONDS });
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ message: err.message, retryAfter: err.retryAfter });
    console.error("[email] resend failed:", err.message);
    res.status(502).json({ message: "We couldn't send the email right now. Please try again in a minute." });
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

// Forgot password: the response is the same whether or not the email has an account.
export const forgotPassword = async (req, res, next) => {
  try {
    const email = str(req.body.email).toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    try {
      await passwordReset.requestResetCode(email);
    } catch (err) {
      if (err.status === 429) return res.status(429).json({ message: err.message, retryAfter: err.retryAfter });
      console.error("[email] password reset code not sent:", err.message);
      return res.status(502).json({ message: "We couldn't send the email right now. Please try again in a minute." });
    }
    res.json({
      message: `If an account exists for ${email}, a 6-digit code has been sent.`,
      codeTtlMinutes: passwordReset.CODE_TTL_MINUTES,
      resendCooldownSeconds: passwordReset.RESEND_COOLDOWN_SECONDS,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyResetCode = async (req, res, next) => {
  try {
    const resetToken = await passwordReset.verifyResetCode(str(req.body.email).toLowerCase(), str(req.body.code));
    res.json({ resetToken });
  } catch (err) {
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({ message: "Password must be 6–72 characters." });
    }
    if (req.body.confirmPassword !== undefined && req.body.confirmPassword !== password) {
      return res.status(400).json({ message: "Passwords don't match." });
    }
    await passwordReset.resetPassword(str(req.body.email).toLowerCase(), str(req.body.resetToken), password);
    res.json({ message: "Your password has been reset. You can sign in now." });
  } catch (err) {
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
