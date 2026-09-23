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

// Perfect Corp's mask_urls (per-concern overlay PNGs) and resize_image are
// signed links that expire 2 hours after the scan. Copy them into uploads/
// so the results page can keep showing them. rawMetrics.perfectCorpOutput
// stays exactly as the API returned it; the saved copies go alongside it.
const PROVIDER_IMAGE_TIMEOUT_MS = 15000;

const saveRemoteImage = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(PROVIDER_IMAGE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Perfect Corp serves everything as binary/octet-stream, so take the
  // extension from the file name in the URL instead of the content type.
  const ext = new URL(url).pathname.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await res.arrayBuffer()));
  return `/uploads/${filename}`;
};

const saveProviderImages = async (output = []) => {
  // Both analysis tasks return the same resized photo; download it once.
  const firstResize = output.find((entry) => entry.type === "resize_image");
  const jobs = output.flatMap((entry) => {
    const url = entry.mask_urls?.[0];
    if (!url || (entry.type === "resize_image" && entry !== firstResize)) return [];
    return [{ type: entry.type, region: entry.region ?? null, url }];
  });
  const results = await Promise.all(
    jobs.map(async (job) => {
      try {
        return { type: job.type, region: job.region, url: await saveRemoteImage(job.url) };
      } catch (err) {
        // A missing overlay shouldn't fail the whole scan.
        console.error(`[scan] could not save ${job.type}${job.region ? `/${job.region}` : ""} image:`, err.message);
        return null;
      }
    })
  );
  const saved = results.filter(Boolean);
  return {
    resizeImageUrl: saved.find((s) => s.type === "resize_image")?.url ?? null,
    masks: saved.filter((s) => s.type !== "resize_image"),
  };
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
    if (analysis.rawMetrics?.perfectCorpOutput) {
      analysis.rawMetrics.savedImages = await saveProviderImages(analysis.rawMetrics.perfectCorpOutput);
    }
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
      faceRegions: analysis.faceRegions || [],
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

    // Recommendations are picked when the scan is saved. A scan saved while
    // the catalogue was empty has none, so fill them in from the current
    // catalogue the first time it's opened.
    if (!scan.recommendedProducts?.length) {
      const recommended = await recommendProducts(scan.concerns, { skinType: req.user.skinType });
      if (recommended.length) {
        scan.recommendedProducts = recommended.map((p) => p._id);
        await scan.save();
        await scan.populate("recommendedProducts");
      }
    }
    res.json({ scan });
  } catch (err) {
    next(err);
  }
};
