import Product from "../models/Product.js";

export const listProducts = async (req, res, next) => {
  try {
    const { q, category, tag, brand, skinType, sort = "-createdAt", page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (brand) filter.brand = brand;
    if (skinType) filter.skinTypes = skinType;
    if (q) filter.$text = { $search: q };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
};

export const listBrands = async (req, res, next) => {
  try {
    const brands = await Product.distinct("brand", { isActive: true });
    res.json({ brands: brands.sort() });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (err) {
    next(err);
  }
};
