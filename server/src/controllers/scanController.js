import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import sharp from "sharp";
import ScanHistory from "../models/ScanHistory.js";
import User from "../models/User.js";
import { analyzeSkin } from "../services/aiDiagnosticsService.js";
import { recommendProducts } from "../services/recommendationEngine.js";
import { scanCosts, isScanEnabled, SERVICE_OFF, chargeScan, refundScan, linkScanCharge, creditSummary } from "../services/credits.js";
import { findDermatologists } from "../services/geoService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export const saveUpload = (buffer) => {
  if (!buffer) return null;
  const filename = `${crypto.randomUUID()}.jpg`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
};

// Re-encodes an uploaded photo as a clean JPEG: proves the bytes really are
// an image (the declared type is only the client's claim), applies phone
// camera rotation, caps the size, and drops all metadata — including the GPS
// location phones embed — before anything is stored or sent to a provider.
const MAX_SIDE = 2048;
export const normalizePhoto = async (file) => {
  if (!file) return null;
  try {
    return await sharp(file.buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    throw Object.assign(new Error("That file isn't a readable photo. Please take or upload a JPEG/PNG picture."), { status: 400 });
  }
};

// Perfect Corp's mask_urls (per-concern overlay PNGs) and resize_image are
// signed links that expire 2 hours after the scan. Copy them into uploads/
// so the results page can keep showing them. rawMetrics.perfectCorpOutput
// stays exactly as the API returned it; the saved copies go alongside it.
const PROVIDER_IMAGE_TIMEOUT_MS = 15000;

export const saveRemoteImage = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(PROVIDER_IMAGE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Perfect Corp serves everything as binary/octet-stream, so take the
  // extension from the file name in the URL instead of the content type.
  const ext = new URL(url).pathname.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await res.arrayBuffer()));
  return `/uploads/${filename}`;
};

export const saveProviderImages = async (output = []) => {
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
    // Quick scan sends only a front selfie and runs on Rupam; detailed adds
    // left/right angles. The mode also selects the AI provider (see analyzeSkin).
    // Focus scan is likewise a single front selfie, run on the Focus API.
    const mode = ["quick", "focus"].includes(req.body?.mode) ? req.body.mode : "detailed";
    if (!isScanEnabled(mode)) return res.status(403).json(SERVICE_OFF(mode));
    if (!req.user.photoConsent?.acceptedAt) {
      return res.status(403).json({ code: "CONSENT_REQUIRED", message: "Please agree to the photo analysis terms before scanning." });
    }
    if (!req.files?.front?.[0]) return res.status(400).json({ message: "A front-facing selfie is required." });

    // Validated and cleaned before any credits are charged.
    const front = await normalizePhoto(req.files.front[0]);
    const left = mode === "detailed" ? await normalizePhoto(req.files?.left?.[0]) : null;
    const right = mode === "detailed" ? await normalizePhoto(req.files?.right?.[0]) : null;

    // Paid before the (costly) AI call runs; refunded below if it fails.
    const charge = await chargeScan(req.user, mode);
    if (!charge) {
      return res.status(402).json({
        code: "INSUFFICIENT_CREDITS",
        message: `A ${mode} scan needs ${scanCosts()[mode]} credits and you have ${req.user.credits ?? 0}. Buy credits to continue.`,
        credits: creditSummary(req.user),
      });
    }

    let scan;
    try {
      const imageUrl = saveUpload(front);
      const leftImageUrl = saveUpload(left);
      const rightImageUrl = saveUpload(right);

      const analysis = await analyzeSkin(
        {
          front,
          left,
          right,
        },
        { mode }
      );
      if (analysis.rawMetrics?.perfectCorpOutput) {
        analysis.rawMetrics.savedImages = await saveProviderImages(analysis.rawMetrics.perfectCorpOutput);
      }
      // Rupam's composite (annotated) image is a signed S3 URL that expires in
      // 24h — copy it into uploads/ so the results page keeps showing it.
      if (analysis.rawMetrics?.compositeUri) {
        try {
          analysis.rawMetrics.savedCompositeUrl = await saveRemoteImage(analysis.rawMetrics.compositeUri);
        } catch (err) {
          console.error("[scan] could not save Rupam composite image:", err.message);
        }
      }
      const recommended = await recommendProducts(analysis.concerns, { skinType: req.user.skinType });

      scan = await ScanHistory.create({
        user: req.user._id,
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
        recommendedProducts: recommended.map((p) => p._id),
        rawMetrics: analysis.rawMetrics,
      });
    } catch (err) {
      // The scan never completed, so give the credits back.
      await refundScan(req.user, charge, mode);
      throw err;
    }
    await linkScanCharge(charge, scan._id);

    // $push rather than save(), so the stale credits on req.user are never
    // written back over the balance chargeScan just updated.
    await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          notifications: {
            title: "Skin analysis ready",
            message: `Your overall skin health score is ${scan.overallScore}/100 (${scan.overallLabel}).`,
          },
        },
      }
    );

    const populated = await scan.populate("recommendedProducts");
    req.user.credits = charge.balance;
    res.status(201).json({ scan: populated, credits: creditSummary(req.user) });
  } catch (err) {
    next(err);
  }
};

export const listMyScans = async (req, res, next) => {
  try {
    const scans = await ScanHistory.find({ user: req.user._id, salon: null })
      .sort({ createdAt: -1 })
      .populate("recommendedProducts");
    res.json({ scans });
  } catch (err) {
    next(err);
  }
};

// Credit balance and per-mode scan costs, for the scan picker/capture page.
export const getScanQuota = async (req, res, next) => {
  try {
    res.json({ credits: creditSummary(req.user) });
  } catch (err) {
    next(err);
  }
};

// Skin clinics near the given point, for the "see a dermatologist" panel.
export const nearbyDermatologists = async (req, res, next) => {
  try {
    const result = await findDermatologists(Number(req.query.lat), Number(req.query.lng));
    res.json(result);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    next(err);
  }
};

export const getScan = async (req, res, next) => {
  try {
    const scan = await ScanHistory.findOne({ _id: req.params.id, user: req.user._id }).populate(
      "recommendedProducts"
    );
    if (!scan) return res.status(404).json({ message: "Scan not found." });

    // Recommendations are picked when the scan is saved. Rebuild them from
    // the current catalogue if the scan has none (catalogue was empty then),
    // any pick has since been retired, or it predates the Blue Satchel
    // products every routine now includes.
    const stale =
      !scan.recommendedProducts?.length ||
      scan.recommendedProducts.some((p) => !p.isActive) ||
      !scan.recommendedProducts.some((p) => p.featured);
    if (stale) {
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
