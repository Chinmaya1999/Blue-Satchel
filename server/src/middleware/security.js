import rateLimit from "express-rate-limit";

/**
 * Request hardening shared by every route: body sanitising (NoSQL operator
 * injection) and per-IP rate limits. Behind nginx, `app.set("trust proxy", 1)`
 * makes req.ip the real visitor address, so limits apply per visitor.
 */

// Removes keys that start with "$" or contain "." from JSON bodies, so a
// value like { "email": { "$ne": null } } can't turn into a MongoDB query
// operator. The app never legitimately sends such keys.
const stripOperators = (value) => {
  if (Array.isArray(value)) return value.map(stripOperators);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) delete value[key];
      else value[key] = stripOperators(value[key]);
    }
  }
  return value;
};

export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") stripOperators(req.body);
  next();
};

const limiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
  });

// Whole API — generous; only stops floods and scrapers.
export const apiLimiter = limiter(1, 300, "Too many requests. Please slow down and try again in a minute.");

// Sign-in / sign-up / Google — slows password guessing and mass sign-ups.
export const authLimiter = limiter(15, 30, "Too many sign-in attempts. Please wait 15 minutes and try again.");

// Email code entry and resends (on top of the per-code attempt limit).
export const verifyLimiter = limiter(15, 20, "Too many verification attempts. Please wait 15 minutes and try again.");

// Starting scans (each one calls a paid AI provider).
export const scanLimiter = limiter(10, 20, "Too many scans in a short time. Please wait a few minutes.");

// Creating payment orders / checkouts.
export const paymentLimiter = limiter(15, 40, "Too many payment attempts. Please wait a few minutes and try again.");
