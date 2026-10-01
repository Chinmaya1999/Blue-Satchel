import crypto from "crypto";
import CreditPlan from "../models/CreditPlan.js";
import CreditTransaction from "../models/CreditTransaction.js";

// Admin management of credit plans. Purchases keep their own snapshot of the
// plan they bought, so editing or deleting a plan never changes history.

const parsePlanInput = (body, { partial = false } = {}) => {
  const out = {};
  const errors = [];
  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 40) errors.push("Name is required (max 40 characters).");
    else out.name = name;
  }
  if (!partial || body.priceUsd !== undefined) {
    const price = Number(body.priceUsd);
    if (!Number.isFinite(price) || price < 0.05 || price > 10000) errors.push("Price must be between $0.05 and $10,000.");
    else out.priceUsd = Math.round(price * 100) / 100;
  }
  if (!partial || body.credits !== undefined) {
    const credits = Number(body.credits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 1000000) errors.push("Credits must be a whole number from 1 to 1,000,000.");
    else out.credits = credits;
  }
  for (const flag of ["popular", "bestValue", "archived"]) {
    if (body[flag] !== undefined) {
      if (typeof body[flag] !== "boolean") errors.push(`${flag} must be true or false.`);
      else out[flag] = body[flag];
    }
  }
  return { data: out, error: errors[0] };
};

const slug = (name) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "plan"}-${crypto
    .randomBytes(3)
    .toString("hex")}`;

// Only one plan should carry each highlight badge.
const clearOtherBadges = async (plan) => {
  for (const flag of ["popular", "bestValue"]) {
    if (plan[flag]) await CreditPlan.updateMany({ _id: { $ne: plan._id }, [flag]: true }, { [flag]: false });
  }
};

// Every plan (archived included) with its sales so far.
export const listPlans = async (req, res, next) => {
  try {
    const [plans, sales] = await Promise.all([
      CreditPlan.find().sort({ archived: 1, priceUsd: 1 }),
      CreditTransaction.aggregate([
        { $match: { type: "purchase", paymentStatus: "paid" } },
        { $group: { _id: "$plan.id", purchases: { $sum: 1 }, revenueUsd: { $sum: "$amountUsd" }, credits: { $sum: "$amount" } } },
      ]),
    ]);
    const byCode = new Map(sales.map((s) => [s._id, s]));
    res.json({
      plans: plans.map((p) => ({
        ...p.toObject(),
        purchases: byCode.get(p.code)?.purchases || 0,
        revenueUsd: byCode.get(p.code)?.revenueUsd || 0,
        creditsSold: byCode.get(p.code)?.credits || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const { data, error } = parsePlanInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const plan = await CreditPlan.create({ ...data, archived: false, code: slug(data.name) });
    await clearOtherBadges(plan);
    res.status(201).json({ plan });
  } catch (err) {
    next(err);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { data, error } = parsePlanInput(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const plan = await CreditPlan.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ message: "Plan not found." });
    await clearOtherBadges(plan);
    res.json({ plan });
  } catch (err) {
    next(err);
  }
};

// Plans that were never bought are removed outright; plans with sales are
// archived (hidden from customers) so their revenue stays in the reports.
export const deletePlan = async (req, res, next) => {
  try {
    const plan = await CreditPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found." });
    const activeLeft = await CreditPlan.countDocuments({ archived: false, _id: { $ne: plan._id } });
    if (!plan.archived && activeLeft === 0) {
      return res.status(400).json({ message: "Keep at least one plan available so customers can buy credits." });
    }
    const hasSales = await CreditTransaction.exists({ type: "purchase", "plan.id": plan.code });
    if (hasSales) {
      plan.archived = true;
      plan.popular = false;
      plan.bestValue = false;
      await plan.save();
      return res.json({ archived: true, plan });
    }
    await plan.deleteOne();
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
};
