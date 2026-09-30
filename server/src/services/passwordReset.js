import crypto from "crypto";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "./emailService.js";

/**
 * Forgot-password flow, in three steps:
 *   1. requestResetCode: emails a 6-digit code (hash stored, 10 min, 60s resend cooldown)
 *   2. verifyResetCode:  checks the code (5 tries) and returns a one-time reset token (15 min)
 *   3. resetPassword:    checks the token and sets the new password
 * Only hashes are stored, keyed to the server secret.
 */
export const CODE_TTL_MINUTES = 10;
export const TOKEN_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

const hash = (userId, value) =>
  crypto.createHash("sha256").update(`reset:${userId}:${value}:${process.env.JWT_SECRET}`).digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const failure = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

/** Silent for unknown emails and Google-only accounts so the form can't be used to probe who has an account. */
export const requestResetCode = async (email) => {
  const user = await User.findOne({ email }).select("+passwordReset");
  if (!user || user.authProvider !== "local") return;

  const lastSentAt = user.passwordReset?.lastSentAt;
  if (lastSentAt) {
    const waitMs = RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - lastSentAt.getTime());
    if (waitMs > 0) {
      const retryAfter = Math.ceil(waitMs / 1000);
      throw failure(429, `Please wait ${retryAfter}s before requesting another code.`, { retryAfter });
    }
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await User.updateOne(
    { _id: user._id },
    {
      passwordReset: {
        codeHash: hash(user._id, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date(),
      },
    }
  );
  await sendPasswordResetEmail({ to: user.email, name: user.name, code, expiresInMinutes: CODE_TTL_MINUTES });
};

export const verifyResetCode = async (email, code) => {
  if (!/^\d{6}$/.test(String(code || ""))) throw failure(400, "Enter the 6-digit code from your email.");

  const user = await User.findOne({ email }).select("+passwordReset");
  const pending = user?.passwordReset;
  if (!user || !pending?.codeHash) throw failure(400, "That code isn't valid. Request a new one.");
  if (pending.expiresAt < new Date()) throw failure(400, "This code has expired. Request a new one.");
  if (pending.attempts >= MAX_ATTEMPTS) throw failure(429, "Too many incorrect attempts. Request a new code.");

  if (!safeEqual(pending.codeHash, hash(user._id, code))) {
    await User.updateOne({ _id: user._id }, { $inc: { "passwordReset.attempts": 1 } });
    const left = MAX_ATTEMPTS - pending.attempts - 1;
    throw failure(
      400,
      left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many incorrect attempts. Request a new code."
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        "passwordReset.tokenHash": hash(user._id, resetToken),
        "passwordReset.tokenExpiresAt": new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
      $unset: { "passwordReset.codeHash": 1, "passwordReset.expiresAt": 1 },
    }
  );
  return resetToken;
};

export const resetPassword = async (email, resetToken, password) => {
  const user = await User.findOne({ email }).select("+passwordReset +password");
  const pending = user?.passwordReset;
  if (!user || !pending?.tokenHash || !resetToken || pending.tokenExpiresAt < new Date()) {
    throw failure(400, "Your reset session has expired. Start again.");
  }
  if (!safeEqual(pending.tokenHash, hash(user._id, resetToken))) {
    throw failure(400, "Your reset session has expired. Start again.");
  }

  user.password = password; // hashed by the model's pre-save hook
  user.passwordReset = undefined;
  // Receiving the code proves they own this inbox.
  if (user.emailVerified === false) {
    user.emailVerified = true;
    user.emailVerification = undefined;
  }
  await user.save();
};
