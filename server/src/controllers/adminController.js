import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import ScanHistory from "../models/ScanHistory.js";
import CRMSyncLog from "../models/CRMSyncLog.js";
import CreditTransaction from "../models/CreditTransaction.js";
import { creditSummary, grantCredits, scanCosts, BASE_SCAN_COSTS } from "../services/credits.js";
import { loadSettings, updateSettings } from "../services/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

const deleteUploadedFile = (imageUrl) => {
  if (!imageUrl) return;
  const filePath = path.join(uploadsDir, path.basename(imageUrl));
  fs.unlink(filePath, () => {}); // best-effort — a missing file is not an error here
};

// --- Dashboard ---
export const getOverview = async (req, res, next) => {
  try {
    const [customers, orders, scans, products, revenueAgg, creditAgg] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      ScanHistory.countDocuments(),
      Product.countDocuments({ isActive: true }),
      // Paid orders, plus cash-on-delivery orders that weren't cancelled;
      // unpaid online checkouts aren't revenue.
      Order.aggregate([
        {
          $match: {
            $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod", status: { $ne: "cancelled" } }],
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      CreditTransaction.aggregate([
        { $match: { type: "purchase", paymentStatus: "paid" } },
        { $group: { _id: null, revenueUsd: { $sum: "$amountUsd" }, purchases: { $sum: 1 } } },
      ]),
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
        creditRevenueUsd: creditAgg[0]?.revenueUsd || 0,
        creditPurchases: creditAgg[0]?.purchases || 0,
      },
      recentOrders,
      recentScans,
    });
  } catch (err) {
    next(err);
  }
};

// --- User Operations (5.4) ---
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listCustomers = async (req, res, next) => {
  try {
    const { q, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role === "customer" || role === "admin") filter.role = role;
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { "signupLocation.city": rx }];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    const stats = await ScanHistory.aggregate([
      { $match: { user: { $in: users.map((u) => u._id) } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          scanCount: { $sum: 1 },
          lastScanAt: { $first: "$createdAt" },
          lastScore: { $first: "$overallScore" },
          lastLabel: { $first: "$overallLabel" },
        },
      },
    ]);
    const byUser = new Map(stats.map((s) => [String(s._id), s]));
    const items = users.map((u) => {
      const st = byUser.get(String(u._id));
      return {
        ...u.toSafeObject(),
        scanCount: st?.scanCount || 0,
        lastScanAt: st?.lastScanAt || null,
        lastScore: st?.lastScore ?? null,
        lastLabel: st?.lastLabel || null,
        credits: creditSummary(u),
      };
    });
    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
};

// Every user with a known signup location, for the admin map.
export const listUserLocations = async (req, res, next) => {
  try {
    const users = await User.find(
      { "signupLocation.lat": { $ne: null } },
      "name email role signupLocation createdAt"
    ).sort({ createdAt: -1 });
    res.json({ items: users });
  } catch (err) {
    next(err);
  }
};

export const getCustomer = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "User not found." });
    const [scans, orders, creditTransactions] = await Promise.all([
      ScanHistory.find({ user: customer._id }).sort({ createdAt: -1 }).populate("recommendedProducts"),
      Order.find({ user: customer._id }).sort({ createdAt: -1 }),
      CreditTransaction.find({ user: customer._id }).sort({ createdAt: -1 }).limit(100).populate("createdBy", "name"),
    ]);
    res.json({ customer: { ...customer.toSafeObject(), credits: creditSummary(customer) }, scans, orders, creditTransactions });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const allowed = ["name", "email", "phone", "skinType", "role", "dateOfBirth", "address"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    }
    if (String(user._id) === String(req.user._id) && user.role !== "admin") {
      return res.status(400).json({ message: "You can't remove your own admin access." });
    }
    await user.save();
    res.json({ user: { ...user.toSafeObject(), credits: creditSummary(user) } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Another account already uses that email." });
    next(err);
  }
};

// Deletes the account and its scans (with their photos). Orders are kept
// for the business record.
export const deleteUser = async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't delete your own account." });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const scans = await ScanHistory.find({ user: user._id });
    for (const scan of scans) {
      deleteUploadedFile(scan.imageUrl);
      deleteUploadedFile(scan.leftImageUrl);
      deleteUploadedFile(scan.rightImageUrl);
    }
    await ScanHistory.deleteMany({ user: user._id });
    res.json({ message: "User deleted.", scansDeleted: scans.length });
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

export const getScanAdmin = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findById(req.params.id)
      .populate("user", "name email phone skinType dateOfBirth signupLocation")
      .populate("recommendedProducts");
    if (!scan) return res.status(404).json({ message: "Scan not found." });
    res.json({ scan });
  } catch (err) {
    next(err);
  }
};

export const deleteScan = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findByIdAndDelete(req.params.id);
    if (!scan) return res.status(404).json({ message: "Scan not found." });
    deleteUploadedFile(scan.imageUrl);
    deleteUploadedFile(scan.leftImageUrl);
    deleteUploadedFile(scan.rightImageUrl);
    res.json({ message: "Scan deleted." });
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

// --- Credits & payments ---

// Every credit movement (purchases incl. declined ones, scan charges,
// refunds, admin adjustments) plus revenue and usage totals.
export const listCreditTransactions = async (req, res, next) => {
  try {
    const { type, status, q, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (["purchase", "scan", "refund", "adjustment"].includes(type)) filter.type = type;
    if (["paid", "failed", "pending"].includes(status)) filter.paymentStatus = status;
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      const users = await User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }, "_id");
      filter.$or = [{ user: { $in: users.map((u) => u._id) } }, { paymentReference: rx }];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total, purchaseTotals, spentAgg, balanceAgg] = await Promise.all([
      CreditTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("user", "name email phone")
        .populate("createdBy", "name"),
      CreditTransaction.countDocuments(filter),
      CreditTransaction.aggregate([
        { $match: { type: "purchase" } },
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            revenueUsd: { $sum: "$amountUsd" },
            credits: { $sum: "$amount" },
            buyers: { $addToSet: "$user" },
          },
        },
      ]),
      CreditTransaction.aggregate([
        { $match: { type: { $in: ["scan", "refund"] } } },
        { $group: { _id: "$scanMode", net: { $sum: "$amount" }, scans: { $sum: { $cond: [{ $eq: ["$type", "scan"] }, 1, 0] } } } },
      ]),
      User.aggregate([{ $group: { _id: null, outstanding: { $sum: "$credits" } } }]),
    ]);

    const paid = purchaseTotals.find((t) => t._id === "paid");
    const failed = purchaseTotals.find((t) => t._id === "failed");
    const pending = purchaseTotals.find((t) => t._id === "pending");

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats: {
        revenueUsd: paid?.revenueUsd || 0,
        purchases: paid?.count || 0,
        failedPurchases: failed?.count || 0,
        pendingPurchases: pending?.count || 0,
        payingCustomers: paid?.buyers?.length || 0,
        creditsSold: paid?.credits || 0,
        creditsSpent: -spentAgg.reduce((sum, m) => sum + m.net, 0),
        creditsOutstanding: balanceAgg[0]?.outstanding || 0,
        byMode: Object.fromEntries(spentAgg.map((m) => [m._id, { scans: m.scans, credits: -m.net }])),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Manually add or remove credits (goodwill, refunds, corrections).
export const adjustUserCredits = async (req, res, next) => {
  try {
    const amount = Math.trunc(Number(req.body.amount));
    const note = String(req.body.note || "").trim();
    if (!amount) return res.status(400).json({ message: "Enter a non-zero number of credits." });
    if (!note) return res.status(400).json({ message: "Add a short note explaining the adjustment." });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const result = await grantCredits(user._id, amount, { type: "adjustment", note, createdBy: req.user._id });
    if (!result) {
      return res.status(400).json({ message: `This user only has ${user.credits ?? 0} credits.` });
    }
    user.credits = result.balance;
    res.json({ credits: creditSummary(user), transaction: result.transaction });
  } catch (err) {
    next(err);
  }
};

// --- Site settings ---

export const getAppSettings = async (req, res, next) => {
  try {
    res.json({ settings: await loadSettings(), costs: scanCosts(), baseCosts: BASE_SCAN_COSTS });
  } catch (err) {
    next(err);
  }
};

export const updateAppSettings = async (req, res, next) => {
  try {
    for (const key of ["quickScanFree", "shopEnabled"]) {
      if (req.body[key] !== undefined && typeof req.body[key] !== "boolean") {
        return res.status(400).json({ message: `${key} must be true or false.` });
      }
    }
    const settings = await updateSettings(req.body, req.user._id);
    res.json({ settings, costs: scanCosts(), baseCosts: BASE_SCAN_COSTS });
  } catch (err) {
    next(err);
  }
};
