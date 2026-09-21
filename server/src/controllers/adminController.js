import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import ScanHistory from "../models/ScanHistory.js";
import CRMSyncLog from "../models/CRMSyncLog.js";

// --- Dashboard ---
export const getOverview = async (req, res, next) => {
  try {
    const [customers, orders, scans, products, revenueAgg] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      ScanHistory.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
    ]);
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email");
    const recentScans = await ScanHistory.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email");
    res.json({
      stats: {
        customers,
        orders,
        scans,
        products,
        revenue: revenueAgg[0]?.total || 0,
      },
      recentOrders,
      recentScans,
    });
  } catch (err) {
    next(err);
  }
};

// --- Customer Operations (5.4) ---
export const listCustomers = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 15 } = req.query;
    const filter = { role: "customer" };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
};

export const getCustomer = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found." });
    const [scans, orders] = await Promise.all([
      ScanHistory.find({ user: customer._id }).sort({ createdAt: -1 }).populate("recommendedProducts"),
      Order.find({ user: customer._id }).sort({ createdAt: -1 }),
    ]);
    res.json({ customer, scans, orders });
  } catch (err) {
    next(err);
  }
};

// --- Scan History Viewer (5.4) ---
export const listAllScans = async (req, res, next) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const [items, total] = await Promise.all([
      ScanHistory.find()
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("user", "name email")
        .populate("recommendedProducts"),
      ScanHistory.countDocuments(),
    ]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
};

// --- Product Operations (5.4) ---
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deactivated.", product });
  } catch (err) {
    next(err);
  }
};

export const listProductsAdmin = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ items: products });
  } catch (err) {
    next(err);
  }
};

// --- Order Operations (5.4) ---
export const listAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("user", "name email"),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status." });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

// --- CRM Sync Log (visibility into Section 5.3 CRM integration) ---
export const listCrmLogs = async (req, res, next) => {
  try {
    const logs = await CRMSyncLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ items: logs });
  } catch (err) {
    next(err);
  }
};
