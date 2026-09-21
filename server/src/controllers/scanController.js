import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import ScanHistory from "../models/ScanHistory.js";
import { analyzeSkin } from "../services/aiDiagnosticsService.js";
import { recommendProducts } from "../services/recommendationEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const saveUpload = (file) => {
  if (!file) return null;
  const filename = `${crypto.randomUUID()}.jpg`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return `/uploads/${filename}`;
};

export const createScan = async (req, res, next) => {
  try {
    const front = req.files?.front?.[0];
    const left = req.files?.left?.[0];
    const right = req.files?.right?.[0];

    if (!front) return res.status(400).json({ message: "A front-facing selfie is required." });

    const imageUrl = saveUpload(front);
    const leftImageUrl = saveUpload(left);
    const rightImageUrl = saveUpload(right);

    const analysis = await analyzeSkin({
      front: front.buffer,
      left: left?.buffer,
      right: right?.buffer,
    });
    const recommended = await recommendProducts(analysis.concerns, { skinType: req.user.skinType });

    const scan = await ScanHistory.create({
      user: req.user._id,
      imageUrl,
      leftImageUrl,
      rightImageUrl,
      provider: analysis.provider,
      overallScore: analysis.overallScore,
      overallLabel: analysis.overallLabel,
      concerns: analysis.concerns,
      recommendedProducts: recommended.map((p) => p._id),
      rawMetrics: analysis.rawMetrics,
    });

    req.user.notifications.push({
      title: "Skin analysis ready",
      message: `Your overall skin health score is ${analysis.overallScore}/100 (${analysis.overallLabel}).`,
    });
    await req.user.save();

    const populated = await scan.populate("recommendedProducts");
    res.status(201).json({ scan: populated });
  } catch (err) {
    next(err);
  }
};

export const listMyScans = async (req, res, next) => {
  try {
    const scans = await ScanHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("recommendedProducts");
    res.json({ scans });
  } catch (err) {
    next(err);
  }
};

export const getScan = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findOne({ _id: req.params.id, user: req.user._id }).populate(
      "recommendedProducts"
    );
    if (!scan) return res.status(404).json({ message: "Scan not found." });
    res.json({ scan });
  } catch (err) {
    next(err);
  }
};
