import mongoose from "mongoose";

// A credit plan customers can buy, managed from the admin console. `code` is
// the stable id purchases reference (purchases also keep their own snapshot
// of name/credits/price, so editing a plan never rewrites history). Deleting
// a plan that has sales archives it instead, so its revenue stays reportable.
const creditPlanSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    // Admins set plan prices in rupees. `priceInr` is the exact amount charged
    // when payments run in INR; `priceUsd` is its dollar equivalent at the time
    // it was saved (kept for reports and for USD checkout).
    priceInr: { type: Number, min: 1, max: 1000000 },
    priceUsd: { type: Number, required: true, min: 0.001, max: 10000 },
    credits: { type: Number, required: true, min: 1, max: 1000000 },
    popular: { type: Boolean, default: false },
    bestValue: { type: Boolean, default: false },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("CreditPlan", creditPlanSchema);
