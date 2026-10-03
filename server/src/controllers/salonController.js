import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import sharp from "sharp";
import Salon from "../models/Salon.js";
import SalonProduct from "../models/SalonProduct.js";
import SalonBill from "../models/SalonBill.js";
import SalonReview from "../models/SalonReview.js";
import ScanHistory from "../models/ScanHistory.js";
import User from "../models/User.js";
import { analyzeSkin } from "../services/aiDiagnosticsService.js";
import { scanCosts, isScanEnabled, SERVICE_OFF, chargeScan, refundScan, linkScanCharge, creditSummary } from "../services/credits.js";
import { saveUpload, normalizePhoto, saveRemoteImage, saveProviderImages } from "./scanController.js";
import { applyProfile, hasPurchasedPlan, planScanPricing, toPaise } from "../services/salonService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
const MODES = ["quick", "focus", "detailed"];

// Loads the signed-in owner's salon (every route below needs it).
export const loadSalon = async (req, res, next) => {
  try {
    if (req.user.role !== "salon") return res.status(403).json({ message: "Salon account required." });
    const salon = await Salon.findOne({ owner: req.user._id });
    if (!salon) return res.status(404).json({ message: "No salon is linked to this account. Please contact support." });
    req.salon = salon;
    next();
  } catch (err) {
    next(err);
  }
};

const salonView = async (req) => ({
  salon: req.salon,
  credits: creditSummary(req.user),
  planPurchased: await hasPurchasedPlan(req.user),
});

export const getMySalon = async (req, res, next) => {
  try {
    res.json(await salonView(req));
  } catch (err) {
    next(err);
  }
};

export const updateMySalon = async (req, res, next) => {
  try {
    applyProfile(req.salon, req.body);
    await req.salon.save();
    res.json(await salonView(req));
  } catch (err) {
    next(err);
  }
};

// Logo / cover / product photo: validated as a real image, re-encoded, EXIF stripped.
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please choose an image." });
    let buffer;
    try {
      buffer = await sharp(req.file.buffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      return res.status(400).json({ message: "That file isn't a readable image." });
    }
    const filename = `salon-${crypto.randomUUID()}.webp`;
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    res.status(201).json({ url: `/uploads/${filename}` });
  } catch (err) {
    next(err);
  }
};

// --- Pricing -------------------------------------------------------------

export const getPricing = async (req, res, next) => {
  try {
    const pricing = await planScanPricing();
    res.json({
      ...pricing,
      scanPrices: req.salon.scanPrices,
      planPurchased: await hasPurchasedPlan(req.user),
      credits: creditSummary(req.user),
    });
  } catch (err) {
    next(err);
  }
};

// The salon's own price per scan for its customers — unlocked once a plan is bought.
export const setScanPrices = async (req, res, next) => {
  try {
    if (!(await hasPurchasedPlan(req.user))) {
      return res.status(403).json({ code: "PLAN_REQUIRED", message: "Buy a pricing plan first, then set your customer scan prices." });
    }
    for (const mode of MODES) {
      if (req.body[mode] === undefined) continue;
      const paise = toPaise(req.body[mode]);
      if (paise === null) return res.status(400).json({ message: `Invalid ${mode} scan price.` });
      req.salon.scanPrices[mode] = paise;
    }
    await req.salon.save();
    res.json({ scanPrices: req.salon.scanPrices });
  } catch (err) {
    next(err);
  }
};

// --- Products ------------------------------------------------------------

const productFields = (body) => {
  const out = {};
  if (typeof body.name === "string") out.name = body.name.trim().slice(0, 120);
  if (typeof body.brand === "string") out.brand = body.brand.trim().slice(0, 60);
  if (typeof body.description === "string") out.description = body.description.trim().slice(0, 1000);
  if (typeof body.imageUrl === "string") out.imageUrl = body.imageUrl.trim().slice(0, 300);
  if (Array.isArray(body.concerns)) out.concerns = body.concerns;
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (body.pricePaise !== undefined) {
    const p = toPaise(body.pricePaise);
    if (p === null) throw Object.assign(new Error("Invalid price."), { status: 400 });
    out.pricePaise = p;
  }
  return out;
};

export const listProducts = async (req, res, next) => {
  try {
    res.json({ products: await SalonProduct.find({ salon: req.salon._id }).sort({ createdAt: -1 }) });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const fields = productFields(req.body);
    if (!fields.name || fields.pricePaise === undefined) return res.status(400).json({ message: "Product name and price are required." });
    const product = await SalonProduct.create({ ...fields, salon: req.salon._id });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await SalonProduct.findOneAndUpdate(
      { _id: req.params.id, salon: req.salon._id },
      productFields(req.body),
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await SalonProduct.findOneAndDelete({ _id: req.params.id, salon: req.salon._id });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// --- Scanning customers ---------------------------------------------------

export const createSalonScan = async (req, res, next) => {
  try {
    const mode = MODES.includes(req.body?.mode) ? req.body.mode : "focus";
    const name = String(req.body?.customerName || "").trim().slice(0, 80);
    const phone = String(req.body?.customerPhone || "").trim().slice(0, 30);
    const email = String(req.body?.customerEmail || "").trim().toLowerCase().slice(0, 120);
    if (!isScanEnabled(mode)) return res.status(403).json(SERVICE_OFF(mode));
    if (!name) return res.status(400).json({ message: "Customer name is required." });
    if (req.body?.consent !== "true" && req.body?.consent !== true) {
      return res.status(403).json({ code: "CONSENT_REQUIRED", message: "Confirm the customer agreed to the face photo analysis." });
    }
    if (!req.files?.front?.[0]) return res.status(400).json({ message: "A front-facing photo of the customer is required." });

    const front = await normalizePhoto(req.files.front[0]);
    const left = mode === "detailed" ? await normalizePhoto(req.files?.left?.[0]) : null;
    const right = mode === "detailed" ? await normalizePhoto(req.files?.right?.[0]) : null;

    const charge = await chargeScan(req.user, mode);
    if (!charge) {
      return res.status(402).json({
        code: "INSUFFICIENT_CREDITS",
        message: `A ${mode} scan needs ${scanCosts()[mode]} credits and you have ${req.user.credits ?? 0}. Buy a pricing plan to continue.`,
        credits: creditSummary(req.user),
      });
    }

    let scan;
    try {
      const imageUrl = saveUpload(front);
      const leftImageUrl = saveUpload(left);
      const rightImageUrl = saveUpload(right);
      const analysis = await analyzeSkin({ front, left, right }, { mode });
      if (analysis.rawMetrics?.perfectCorpOutput) {
        analysis.rawMetrics.savedImages = await saveProviderImages(analysis.rawMetrics.perfectCorpOutput);
      }
      if (analysis.rawMetrics?.compositeUri) {
        try {
          analysis.rawMetrics.savedCompositeUrl = await saveRemoteImage(analysis.rawMetrics.compositeUri);
        } catch (err) {
          console.error("[salon scan] could not save composite image:", err.message);
        }
      }
      scan = await ScanHistory.create({
        user: req.user._id,
        salon: req.salon._id,
        salonCustomer: { name, phone, email, consentAt: new Date() },
        mode,
        creditsCharged: charge.charged,
        imageUrl,
        leftImageUrl,
        rightImageUrl,
        provider: analysis.provider,
        overallScore: analysis.overallScore,
        overallLabel: analysis.overallLabel,
        concerns: analysis.concerns,
        faceRegions: analysis.faceRegions || [],
        rawMetrics: analysis.rawMetrics,
      });
    } catch (err) {
      await refundScan(req.user, charge, mode);
      throw err;
    }
    await linkScanCharge(charge, scan._id);
    req.user.credits = charge.balance;
    res.status(201).json({ scan, credits: creditSummary(req.user) });
  } catch (err) {
    next(err);
  }
};

// Lean list (no raw API payloads) with each scan's bill status.
export const listSalonScans = async (req, res, next) => {
  try {
    const scans = await ScanHistory.find({ salon: req.salon._id })
      .select("mode imageUrl overallScore overallLabel salonCustomer createdAt creditsCharged")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const bills = await SalonBill.find({ scan: { $in: scans.map((s) => s._id) } }).select("scan status totalPaise invoiceNumber").lean();
    const byScan = new Map(bills.map((b) => [String(b.scan), b]));
    res.json({ scans: scans.map((s) => ({ ...s, bill: byScan.get(String(s._id)) || null })) });
  } catch (err) {
    next(err);
  }
};

// Concern tags from the scan's worst findings, to suggest matching products.
const suggestFor = (scan, products) => {
  const worst = new Set(scan.concerns.filter((c) => c.severity >= 40).map((c) => c.key));
  const score = (p) => p.concerns.filter((t) => worst.has(t)).length;
  return products
    .map((p) => ({ id: String(p._id), n: score(p) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.id);
};

export const getSalonScan = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findOne({ _id: req.params.id, salon: req.salon._id }).select("-rawMetrics").lean();
    if (!scan) return res.status(404).json({ message: "Scan not found." });
    const products = await SalonProduct.find({ salon: req.salon._id, active: true }).sort({ name: 1 });
    const bill = await SalonBill.findOne({ scan: scan._id });
    res.json({
      scan,
      salon: { name: req.salon.name, scanPrices: req.salon.scanPrices },
      products,
      suggestedIds: suggestFor(scan, products),
      bill,
    });
  } catch (err) {
    next(err);
  }
};

export const setRecommendations = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.productIds) ? req.body.productIds : [];
    const valid = await SalonProduct.find({ _id: { $in: ids }, salon: req.salon._id }).select("_id");
    const scan = await ScanHistory.findOneAndUpdate(
      { _id: req.params.id, salon: req.salon._id },
      { salonRecommended: valid.map((p) => p._id) },
      { new: true }
    ).select("salonRecommended");
    if (!scan) return res.status(404).json({ message: "Scan not found." });
    res.json({ salonRecommended: scan.salonRecommended });
  } catch (err) {
    next(err);
  }
};

// --- Bills ----------------------------------------------------------------

export const createBill = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findOne({ _id: req.params.id, salon: req.salon._id });
    if (!scan) return res.status(404).json({ message: "Scan not found." });
    if (await SalonBill.exists({ scan: scan._id })) return res.status(409).json({ message: "A bill already exists for this scan." });

    const items = [];
    if (req.body.includeScan !== false) {
      const unit = req.salon.scanPrices[scan.mode] ?? 0;
      items.push({ type: "scan", name: `${scan.mode[0].toUpperCase()}${scan.mode.slice(1)} skin scan`, qty: 1, unitPaise: unit, totalPaise: unit });
    }
    const wanted = Array.isArray(req.body.items) ? req.body.items : [];
    const products = await SalonProduct.find({ _id: { $in: wanted.map((i) => i.productId) }, salon: req.salon._id });
    for (const w of wanted) {
      const p = products.find((x) => String(x._id) === String(w.productId));
      const qty = Math.min(Math.max(parseInt(w.qty, 10) || 1, 1), 99);
      if (p) items.push({ type: "product", product: p._id, name: p.name, qty, unitPaise: p.pricePaise, totalPaise: p.pricePaise * qty });
    }
    if (!items.length) return res.status(400).json({ message: "Add at least one item to the bill." });

    const subtotalPaise = items.reduce((n, i) => n + i.totalPaise, 0);
    const discountPaise = Math.min(toPaise(req.body.discountPaise ?? 0) ?? 0, subtotalPaise);
    const salon = await Salon.findByIdAndUpdate(req.salon._id, { $inc: { billCounter: 1 } }, { new: true });
    const invoiceNumber = `${salon.slug.slice(0, 6).toUpperCase().replace(/-/g, "")}-${String(salon.billCounter).padStart(4, "0")}`;

    const paid = req.body.status === "paid";
    const bill = await SalonBill.create({
      salon: salon._id,
      scan: scan._id,
      invoiceNumber,
      customer: { name: scan.salonCustomer?.name, phone: scan.salonCustomer?.phone, email: scan.salonCustomer?.email },
      items,
      subtotalPaise,
      discountPaise,
      totalPaise: subtotalPaise - discountPaise,
      status: paid ? "paid" : "unpaid",
      paymentMethod: paid && ["cash", "upi", "card", "other"].includes(req.body.paymentMethod) ? req.body.paymentMethod : undefined,
      paidAt: paid ? new Date() : undefined,
      notes: typeof req.body.notes === "string" ? req.body.notes.trim().slice(0, 500) : undefined,
    });
    res.status(201).json({ bill });
  } catch (err) {
    next(err);
  }
};

export const listBills = async (req, res, next) => {
  try {
    const bills = await SalonBill.find({ salon: req.salon._id }).sort({ createdAt: -1 }).limit(200);
    res.json({ bills });
  } catch (err) {
    next(err);
  }
};

export const getBill = async (req, res, next) => {
  try {
    const bill = await SalonBill.findOne({ _id: req.params.id, salon: req.salon._id });
    if (!bill) return res.status(404).json({ message: "Bill not found." });
    res.json({ bill, salon: req.salon });
  } catch (err) {
    next(err);
  }
};

export const updateBill = async (req, res, next) => {
  try {
    const bill = await SalonBill.findOne({ _id: req.params.id, salon: req.salon._id });
    if (!bill) return res.status(404).json({ message: "Bill not found." });
    if (["paid", "unpaid"].includes(req.body.status)) {
      bill.status = req.body.status;
      bill.paidAt = bill.status === "paid" ? new Date() : undefined;
      if (bill.status === "unpaid") bill.paymentMethod = undefined;
    }
    if (["cash", "upi", "card", "other"].includes(req.body.paymentMethod)) bill.paymentMethod = req.body.paymentMethod;
    await bill.save();
    res.json({ bill });
  } catch (err) {
    next(err);
  }
};

// --- Overview ---------------------------------------------------------------

export const getStats = async (req, res, next) => {
  try {
    const salonId = req.salon._id;
    const [scans, products, billAgg, reviews] = await Promise.all([
      ScanHistory.countDocuments({ salon: salonId }),
      SalonProduct.countDocuments({ salon: salonId }),
      SalonBill.aggregate([
        { $match: { salon: salonId } },
        { $group: { _id: "$status", total: { $sum: "$totalPaise" }, n: { $sum: 1 } } },
      ]),
      SalonReview.find({ salon: salonId }).sort({ createdAt: -1 }).limit(5).populate("user", "name"),
    ]);
    const by = Object.fromEntries(billAgg.map((b) => [b._id, b]));
    res.json({
      stats: {
        scans,
        products,
        bills: (by.paid?.n || 0) + (by.unpaid?.n || 0),
        revenuePaise: by.paid?.total || 0,
        outstandingPaise: by.unpaid?.total || 0,
      },
      reviews,
    });
  } catch (err) {
    next(err);
  }
};
