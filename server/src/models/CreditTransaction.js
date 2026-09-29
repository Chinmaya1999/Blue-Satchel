import mongoose from "mongoose";

// Ledger of every credit movement: purchases (successful and failed), scan
// charges, refunds for failed scans, and admin adjustments. `amount` is the
// signed change in credits; `balanceAfter` is the user's balance once it
// applied (unset for failed purchases, which change nothing).
const creditTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["purchase", "scan", "refund", "adjustment"], required: true, index: true },
    amount: { type: Number, required: true },
    balanceAfter: Number,

    // Purchases
    plan: { id: String, name: String, credits: Number },
    amountUsd: Number,
    // What Razorpay actually charged (e.g. 264 INR for a $3 plan).
    chargedAmount: Number,
    chargedCurrency: String,
    paymentMethod: { type: String, enum: ["razorpay", "card", "upi"] },
    // pending = Razorpay order created, not paid yet.
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"] },
    paymentReference: String,
    paymentMessage: String,
    razorpayOrderId: { type: String, index: { unique: true, sparse: true } },
    razorpayPaymentId: String,

    // Scan charges / refunds
    scan: { type: mongoose.Schema.Types.ObjectId, ref: "ScanHistory" },
    scanMode: { type: String, enum: ["detailed", "quick", "focus"] },

    // Admin adjustments
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("CreditTransaction", creditTransactionSchema);
