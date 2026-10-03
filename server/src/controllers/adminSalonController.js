import Salon from "../models/Salon.js";
import SalonProduct from "../models/SalonProduct.js";
import SalonReview from "../models/SalonReview.js";
import SalonBill from "../models/SalonBill.js";
import ScanHistory from "../models/ScanHistory.js";
import User from "../models/User.js";
import { applyProfile, recalcRating } from "../services/salonService.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listSalonsAdmin = async (req, res, next) => {
  try {
    const filter = {};
    if (["pending", "approved", "suspended"].includes(req.query.status)) filter.status = req.query.status;
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { "address.city": rx }, { phone: rx }, { email: rx }];
    }
    const salons = await Salon.find(filter).sort({ createdAt: -1 }).limit(300).populate("owner", "name email phone credits");
    const ids = salons.map((s) => s._id);
    const [scanAgg, billAgg, counts] = await Promise.all([
      ScanHistory.aggregate([{ $match: { salon: { $in: ids } } }, { $group: { _id: "$salon", n: { $sum: 1 } } }]),
      SalonBill.aggregate([{ $match: { salon: { $in: ids }, status: "paid" } }, { $group: { _id: "$salon", total: { $sum: "$totalPaise" } } }]),
      Salon.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    const scans = new Map(scanAgg.map((r) => [String(r._id), r.n]));
    const rev = new Map(billAgg.map((r) => [String(r._id), r.total]));
    res.json({
      salons: salons.map((s) => ({ ...s.toObject(), scanCount: scans.get(String(s._id)) || 0, revenuePaise: rev.get(String(s._id)) || 0 })),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  } catch (err) {
    next(err);
  }
};

export const getSalonAdmin = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id).populate("owner", "name email phone credits createdAt");
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    const [products, reviews, bills, scanCount] = await Promise.all([
      SalonProduct.find({ salon: salon._id }).sort({ createdAt: -1 }),
      SalonReview.find({ salon: salon._id }).sort({ createdAt: -1 }).limit(50).populate("user", "name email"),
      SalonBill.find({ salon: salon._id }).sort({ createdAt: -1 }).limit(50),
      ScanHistory.countDocuments({ salon: salon._id }),
    ]);
    res.json({ salon, products, reviews, bills, scanCount });
  } catch (err) {
    next(err);
  }
};

// Approve / suspend / feature, add a note, or fix any profile detail.
export const updateSalonAdmin = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    applyProfile(salon, req.body);
    if (["pending", "approved", "suspended"].includes(req.body.status)) salon.status = req.body.status;
    if (req.body.featured !== undefined) salon.featured = Boolean(req.body.featured);
    if (typeof req.body.adminNote === "string") salon.adminNote = req.body.adminNote.trim().slice(0, 500);
    await salon.save();

    if (req.body.status === "approved" || req.body.status === "suspended") {
      await User.updateOne(
        { _id: salon.owner },
        {
          $push: {
            notifications: {
              title: req.body.status === "approved" ? "Your salon is live" : "Your salon was suspended",
              message:
                req.body.status === "approved"
                  ? `${salon.name} is now listed on Blue Satchel.`
                  : `${salon.name} is no longer listed.${salon.adminNote ? ` Note: ${salon.adminNote}` : ""}`,
            },
          },
        }
      );
    }
    res.json({ salon });
  } catch (err) {
    next(err);
  }
};

// Removes the salon and its products, reviews and bills; the owner's account
// and scan history stay, and they go back to being a normal customer.
export const deleteSalonAdmin = async (req, res, next) => {
  try {
    const salon = await Salon.findByIdAndDelete(req.params.id);
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    await Promise.all([
      SalonProduct.deleteMany({ salon: salon._id }),
      SalonReview.deleteMany({ salon: salon._id }),
      SalonBill.deleteMany({ salon: salon._id }),
      User.updateOne({ _id: salon.owner, role: "salon" }, { role: "customer" }),
      ScanHistory.updateMany({ salon: salon._id }, { $unset: { salon: 1 } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const setSalonProductActive = async (req, res, next) => {
  try {
    const product = await SalonProduct.findByIdAndUpdate(req.params.productId, { active: Boolean(req.body.active) }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

export const deleteSalonProductAdmin = async (req, res, next) => {
  try {
    const product = await SalonProduct.findByIdAndDelete(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteSalonReviewAdmin = async (req, res, next) => {
  try {
    const review = await SalonReview.findByIdAndDelete(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });
    await recalcRating(review.salon);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
