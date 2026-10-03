import User from "../models/User.js";
import CreditTransaction from "../models/CreditTransaction.js";
import CreditPlan from "../models/CreditPlan.js";
import { getSettings } from "./settings.js";

/**
 * Prepaid scan credits. Customers buy a plan, each scan spends credits by
 * mode, and a scan whose AI analysis fails is refunded. Admins scan free.
 * Balance changes are single atomic $inc updates (the charge only matches
 * when the balance covers the cost), so two scans submitted at once can't
 * overspend.
 */

// Plans live in the database (admins manage them). These are only seeded the
// first time the server starts with no plans at all.
const DEFAULT_PLANS = [
  { code: "starter", name: "Starter", priceUsd: 3, credits: 100 },
  { code: "basic", name: "Basic", priceUsd: 5, credits: 150 },
  { code: "plus", name: "Plus", priceUsd: 10, credits: 350, popular: true },
  { code: "pro", name: "Pro", priceUsd: 20, credits: 650 },
  { code: "max", name: "Max", priceUsd: 30, credits: 1000, bestValue: true },
];

export const seedDefaultPlans = async () => {
  if ((await CreditPlan.estimatedDocumentCount()) > 0) return;
  await CreditPlan.insertMany(DEFAULT_PLANS);
  console.log(`[credits] seeded ${DEFAULT_PLANS.length} default credit plans`);
};

// Public shape of a plan (`id` is its stable code).
export const planView = (p) => ({
  id: p.code,
  name: p.name,
  priceUsd: p.priceUsd,
  priceInr: p.priceInr ?? null,
  credits: p.credits,
  popular: p.popular,
  bestValue: p.bestValue,
});

export const listActivePlans = () => CreditPlan.find({ archived: false }).sort({ priceUsd: 1, credits: 1 });

export const findActivePlan = (code) =>
  typeof code === "string" ? CreditPlan.findOne({ code, archived: false }) : null;

// List prices. What a scan actually costs right now comes from scanCosts(),
// which applies the admin's "Quick Scan free" switch.
export const BASE_SCAN_COSTS = { detailed: 100, quick: 50, focus: 50 };

export const scanCosts = () => ({
  ...BASE_SCAN_COSTS,
  focus: getSettings().focusScanFree ? 0 : BASE_SCAN_COSTS.focus,
  detailed: getSettings().detailedScanFree ? 0 : BASE_SCAN_COSTS.detailed,
  quick: getSettings().quickScanFree ? 0 : BASE_SCAN_COSTS.quick,
});

// False while an admin has switched this scan service off.
export const isScanEnabled = (mode) => getSettings()[`${mode}ScanEnabled`] !== false;

export const SERVICE_OFF = (mode) => ({
  code: "SERVICE_DISABLED",
  message: `${mode[0].toUpperCase()}${mode.slice(1)} Scan is unavailable right now. Please try another scan or check back later.`,
});

export const isUnlimited = (user) => user.role === "admin";

export const creditSummary = (user) => ({
  balance: user.credits ?? 0,
  unlimited: isUnlimited(user),
  costs: scanCosts(),
});

/**
 * Adds (or, with a negative amount, removes) credits and records why.
 * Returns { balance, transaction }, or null when a removal would take the
 * balance below zero.
 */
export const grantCredits = async (userId, amount, txn) => {
  const filter = amount < 0 ? { _id: userId, credits: { $gte: -amount } } : { _id: userId };
  const updated = await User.findOneAndUpdate(filter, { $inc: { credits: amount } }, { new: true });
  if (!updated) return null;
  const record = await CreditTransaction.create({ ...txn, user: userId, amount, balanceAfter: updated.credits });
  return { balance: updated.credits, transaction: record };
};

/**
 * Credits a verified Razorpay payment. The pending purchase is flipped to
 * paid in one atomic update first, so a repeated verify call (double click,
 * retry) can never credit the same order twice. Returns the paid purchase
 * transaction, or null when no purchase with that order exists for the user.
 */
export const completePurchase = async (userId, orderId, paymentId) => {
  const txn = await CreditTransaction.findOneAndUpdate(
    { user: userId, razorpayOrderId: orderId, paymentStatus: { $ne: "paid" } },
    { paymentStatus: "paid", razorpayPaymentId: paymentId, paymentReference: paymentId, paymentMessage: "Payment captured" },
    { new: true }
  );
  if (!txn) {
    // Already credited by an earlier call — return it unchanged.
    return CreditTransaction.findOne({ user: userId, razorpayOrderId: orderId, paymentStatus: "paid" });
  }
  const updated = await User.findByIdAndUpdate(userId, { $inc: { credits: txn.plan.credits } }, { new: true });
  txn.amount = txn.plan.credits;
  txn.balanceAfter = updated.credits;
  await txn.save();
  return txn;
};

/**
 * Spends a scan's cost. Returns null when the balance doesn't cover it,
 * otherwise { charged, balance, transactionId } (charged is 0 for admins).
 */
export const chargeScan = async (user, mode) => {
  const cost = scanCosts()[mode];
  // Admins, and free scans (e.g. Quick Scan while the admin has it free).
  if (isUnlimited(user) || cost === 0) return { charged: 0, balance: user.credits ?? 0, transactionId: null };
  const updated = await User.findOneAndUpdate(
    { _id: user._id, credits: { $gte: cost } },
    { $inc: { credits: -cost } },
    { new: true }
  );
  if (!updated) return null;
  const record = await CreditTransaction.create({
    user: user._id,
    type: "scan",
    amount: -cost,
    balanceAfter: updated.credits,
    scanMode: mode,
  });
  return { charged: cost, balance: updated.credits, transactionId: record._id };
};

/** Gives a charge back when the scan it paid for never completed. */
export const refundScan = async (user, charge, mode) => {
  if (!charge?.charged) return;
  await grantCredits(user._id, charge.charged, { type: "refund", scanMode: mode, note: "Scan analysis failed" });
};

/** Links a scan charge to the scan it paid for, once the scan is saved. */
export const linkScanCharge = (charge, scanId) =>
  charge?.transactionId ? CreditTransaction.updateOne({ _id: charge.transactionId }, { scan: scanId }) : null;
