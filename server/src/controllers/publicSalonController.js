import Salon from "../models/Salon.js";
import SalonProduct from "../models/SalonProduct.js";
import SalonReview from "../models/SalonReview.js";
import { publicSalon, recalcRating } from "../services/salonService.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only approved, fully set-up salons are listed on the public site.
const LISTED = { status: "approved", profileComplete: true };

export const listSalons = async (req, res, next) => {
  try {
    const filter = { ...LISTED };
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { "address.city": rx }, { "address.state": rx }, { services: rx }];
    }
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const from = Number.isFinite(lat) && Number.isFinite(lng) && req.query.lat !== "" ? { lat, lng } : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 100);

    const salons = await Salon.find(filter).sort({ featured: -1, ratingAvg: -1, ratingCount: -1 }).limit(limit);
    let list = salons.map((s) => publicSalon(s, from));
    if (req.query.sort === "distance" && from) {
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    } else if (req.query.sort === "new") {
      list = [...list].reverse();
    }
    res.json({ salons: list });
  } catch (err) {
    next(err);
  }
};

export const getSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ slug: req.params.slug, ...LISTED });
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    const [products, reviews] = await Promise.all([
      SalonProduct.find({ salon: salon._id, active: true }).sort({ name: 1 }),
      SalonReview.find({ salon: salon._id }).sort({ createdAt: -1 }).limit(30).populate("user", "name"),
    ]);
    res.json({
      salon: publicSalon(salon),
      products: products.map((p) => ({
        id: p._id, name: p.name, brand: p.brand, description: p.description, imageUrl: p.imageUrl, pricePaise: p.pricePaise,
      })),
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        name: (r.user?.name || "Customer").split(" ")[0],
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// One review per customer; posting again updates it.
export const reviewSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ slug: req.params.slug, ...LISTED });
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    if (String(salon.owner) === String(req.user._id)) return res.status(403).json({ message: "You can't review your own salon." });
    const rating = Math.round(Number(req.body.rating));
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: "Please choose a rating from 1 to 5." });
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim().slice(0, 1000) : "";
    await SalonReview.findOneAndUpdate(
      { salon: salon._id, user: req.user._id },
      { rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await recalcRating(salon._id);
    const fresh = await Salon.findById(salon._id).select("ratingAvg ratingCount");
    res.status(201).json({ ratingAvg: fresh.ratingAvg, ratingCount: fresh.ratingCount });
  } catch (err) {
    next(err);
  }
};
