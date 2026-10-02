import crypto from "crypto";

/**
 * Razorpay Orders API + payment signature verification.
 * https://razorpay.com/docs/payments/server-integration/nodejs/
 *
 * Flow: the server creates an order for a fixed amount, the browser pays it
 * in Razorpay Checkout, and Checkout hands back { order_id, payment_id,
 * signature }. The signature is HMAC-SHA256("order_id|payment_id") keyed
 * with our secret, so a valid one proves Razorpay took payment for *our*
 * order (and therefore our amount) — credits are only granted after that.
 */
const API_BASE = "https://api.razorpay.com/v1";

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID;
export const razorpayCurrency = () => (process.env.RAZORPAY_CURRENCY || "USD").toUpperCase();

// Plans are priced in USD. Razorpay only offers UPI / QR / netbanking /
// wallets for INR orders, so with RAZORPAY_CURRENCY=INR each plan is charged
// at its rupee equivalent (whole rupees) using USD_INR_RATE.
export const usdInrRate = () => Number(process.env.USD_INR_RATE) || 96.07;

export const chargeFor = (priceUsd) => {
  const currency = razorpayCurrency();
  return {
    currency,
    amount: currency === "INR" ? Math.round(priceUsd * usdInrRate()) : priceUsd,
  };
};
export const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const authHeader = () =>
  `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;

/** amount is in the currency's major unit (dollars / rupees); Razorpay wants the minor unit. */
export const createRazorpayOrder = async ({ amount, currency, receipt, notes }) => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes,
      payment_capture: 1,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.id) {
    const err = new Error(json?.error?.description || `Razorpay order creation failed (${res.status}).`);
    err.status = 502;
    err.provider = "razorpay";
    err.providerStatus = res.status;
    err.providerResponse = json;
    throw err;
  }
  return json;
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  if (!orderId || !paymentId || typeof signature !== "string") return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Returns the captured payment id for an order, or null if none has been captured yet. */
export const findCapturedPaymentId = async (orderId) => {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/payments`, {
    headers: { Authorization: authHeader() },
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) return null;
  return json?.items?.find((p) => p.status === "captured")?.id || null;
};
