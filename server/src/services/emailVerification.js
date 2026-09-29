import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationEmail } from "./emailService.js";

/**
 * 6-digit email verification codes. Only a hash of the code is stored
 * (keyed to the user and the server secret), it expires after
 * CODE_TTL_MINUTES, allows MAX_ATTEMPTS wrong guesses before a new code is
 * needed, and can be resent at most once per RESEND_COOLDOWN_SECONDS.
 */
export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

const hashCode = (userId, code) =>
  crypto.createHash("sha256").update(`${userId}:${code}:${process.env.JWT_SECRET}`).digest("hex");

export const isUnverified = (user) => user?.emailVerified === false;

const failure = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

/**
 * Creates a fresh code and emails it. `welcome` sends the welcome variant
 * (on sign-up). Throws { status: 429, retryAfter } inside the resend cooldown.
 */
export const issueVerificationCode = async (user, { welcome = false } = {}) => {
  const current = await User.findById(user._id).select("+emailVerification");
  const lastSentAt = current?.emailVerification?.lastSentAt;
  if (!welcome && lastSentAt) {
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
      emailVerification: {
        codeHash: hashCode(user._id, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date(),
      },
    }
  );
  await sendVerificationEmail({ to: user.email, name: user.name, code, expiresInMinutes: CODE_TTL_MINUTES, welcome });
};

/** Checks a code; on success marks the email verified and clears the code. */
export const verifyEmailCode = async (userId, code) => {
  if (!/^\d{6}$/.test(String(code || ""))) throw failure(400, "Enter the 6-digit code from your email.");

  const user = await User.findById(userId).select("+emailVerification");
  if (!user) throw failure(404, "Account not found.");
  if (!isUnverified(user)) return user;

  const pending = user.emailVerification;
  if (!pending?.codeHash) throw failure(400, "No code has been sent yet. Tap “Resend code”.");
  if (pending.expiresAt < new Date()) throw failure(400, "This code has expired. Tap “Resend code” for a new one.");
  if (pending.attempts >= MAX_ATTEMPTS) {
    throw failure(429, "Too many incorrect attempts. Tap “Resend code” for a new one.");
  }

  const expected = Buffer.from(pending.codeHash, "hex");
  const given = Buffer.from(hashCode(userId, code), "hex");
  if (!crypto.timingSafeEqual(expected, given)) {
    await User.updateOne({ _id: userId }, { $inc: { "emailVerification.attempts": 1 } });
    const left = MAX_ATTEMPTS - pending.attempts - 1;
    throw failure(
      400,
      left > 0
        ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "Too many incorrect attempts. Tap “Resend code” for a new one."
    );
  }

  await User.updateOne({ _id: userId }, { emailVerified: true, $unset: { emailVerification: 1 } });
  user.emailVerified = true;
  user.emailVerification = undefined;
  return user;
};
