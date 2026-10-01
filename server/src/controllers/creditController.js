import User from "../models/User.js";
import CreditTransaction from "../models/CreditTransaction.js";
import { scanCosts, listActivePlans, findActivePlan, planView, creditSummary, completePurchase } from "../services/credits.js";
import {
  isRazorpayConfigured,
  razorpayKeyId,
  razorpayCurrency,
  usdInrRate,
  chargeFor,
  createRazorpayOrder,
  verifyRazorpaySignature,
  findCapturedPaymentId,
} from "../services/razorpay.js";

export const getPlans = async (req, res, next) => {
  try {
    const plans = await listActivePlans();
    res.json({
      // `charge` is what each plan is billed at in the payment currency.
      plans: plans.map((p) => ({ ...planView(p), charge: chargeFor(p.priceUsd) })),
      costs: scanCosts(),
      payment: isRazorpayConfigured()
        ? {
            provider: "razorpay",
            keyId: razorpayKeyId(),
            currency: razorpayCurrency(),
            ...(razorpayCurrency() === "INR" ? { usdInrRate: usdInrRate() } : {}),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyCredits = async (req, res, next) => {
  try {
    // Abandoned checkouts (pending orders) are noise for the customer.
    const transactions = await CreditTransaction.find({ user: req.user._id, paymentStatus: { $ne: "pending" } })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ credits: creditSummary(req.user), transactions });
  } catch (err) {
    next(err);
  }
};

// Step 1: create a Razorpay order for the chosen plan. The price comes from
// the server's plan list, never from the client.
export const createCreditOrder = async (req, res, next) => {
  try {
    if (!isRazorpayConfigured()) return res.status(503).json({ message: "Payments aren't configured yet." });
    const planDoc = await findActivePlan(req.body.planId);
    if (!planDoc) return res.status(400).json({ message: "That plan isn't available any more. Please choose another." });
    const plan = planView(planDoc);

    const charge = chargeFor(plan.priceUsd);
    const order = await createRazorpayOrder({
      ...charge,
      receipt: `cr_${String(req.user._id).slice(-8)}_${Date.now().toString(36)}`,
      notes: { userId: String(req.user._id), planId: plan.id, credits: String(plan.credits) },
    });

    await CreditTransaction.create({
      user: req.user._id,
      type: "purchase",
      amount: 0,
      plan: { id: plan.id, name: plan.name, credits: plan.credits },
      amountUsd: plan.priceUsd,
      chargedAmount: charge.amount,
      chargedCurrency: charge.currency,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      razorpayOrderId: order.id,
    });

    res.status(201).json({
      order: { id: order.id, amount: order.amount, currency: order.currency },
      keyId: razorpayKeyId(),
      plan: { ...plan, charge },
    });
  } catch (err) {
    next(err);
  }
};

// Step 2: Checkout succeeded — verify the signature, then grant credits.
export const verifyCreditPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: "Payment verification failed. If you were charged, contact support." });
    }

    return grantCredits(req, res, orderId, paymentId);
  } catch (err) {
    next(err);
  }
};

// Fallback for when Checkout's success callback never reaches the browser
// (e.g. UPI QR / app payments): ask Razorpay directly whether the order was paid.
export const getOrderStatus = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const owned = await CreditTransaction.exists({ user: req.user._id, razorpayOrderId: orderId });
    if (!owned) return res.status(404).json({ message: "We couldn't find this order on your account." });
    const paymentId = await findCapturedPaymentId(orderId);
    if (!paymentId) return res.json({ paid: false });
    return grantCredits(req, res, orderId, paymentId);
  } catch (err) {
    next(err);
  }
};

const grantCredits = async (req, res, orderId, paymentId) => {
  const txn = await completePurchase(req.user._id, orderId, paymentId);
  if (!txn) return res.status(404).json({ message: "We couldn't find this order on your account." });

  await User.updateOne(
    { _id: req.user._id },
    {
      $push: {
        notifications: {
          title: "Credits added",
          message: `${txn.plan.credits} credits added (${txn.plan.name} plan, $${txn.amountUsd}). Your balance is ${txn.balanceAfter} credits.`,
        },
      },
    }
  );

  req.user.credits = txn.balanceAfter;
  res.json({ paid: true, credits: creditSummary(req.user), transaction: txn });
};

// Checkout reported a failed attempt — recorded so admins can see declines.
// (The customer may still retry and pay the same order afterwards.)
export const markPaymentFailed = async (req, res, next) => {
  try {
    const { orderId, paymentId, reason } = req.body;
    await CreditTransaction.updateOne(
      { user: req.user._id, razorpayOrderId: orderId, paymentStatus: "pending" },
      {
        paymentStatus: "failed",
        razorpayPaymentId: paymentId,
        paymentReference: paymentId,
        paymentMessage: String(reason || "Payment failed").slice(0, 300),
      }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
