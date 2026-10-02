import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import ScanHistory from "../models/ScanHistory.js";
import Order from "../models/Order.js";
import CreditTransaction from "../models/CreditTransaction.js";
import SupportThread from "../models/SupportThread.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// Scan images are stored as "/uploads/<uuid>.<ext>". Only ever touch a plain
// file name inside uploads/, whatever the stored string says.
const removeUpload = (url) => {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return;
  const name = path.basename(url);
  if (!/^[\w-]+\.(jpg|png)$/i.test(name)) return;
  try {
    fs.unlinkSync(path.join(uploadsDir, name));
  } catch {
    // Already gone — nothing to clean up.
  }
};

const imageUrlsOf = (scan) => {
  const urls = [scan.imageUrl, scan.leftImageUrl, scan.rightImageUrl];
  const raw = scan.rawMetrics;
  // Provider overlay images saved next to the scan (see scanController).
  const walk = (value) => {
    if (typeof value === "string") urls.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(raw?.savedImages);
  walk(raw?.savedCompositeUrl);
  return urls;
};

// GET /api/auth/me/export — everything we hold about the signed-in user.
export const exportMyData = async (req, res, next) => {
  try {
    const [scans, orders, creditTransactions, supportChat] = await Promise.all([
      ScanHistory.find({ user: req.user._id }).lean(),
      Order.find({ user: req.user._id }).lean(),
      CreditTransaction.find({ user: req.user._id }).lean(),
      SupportThread.findOne({ user: req.user._id }).select("-unreadForAdmin -unreadForUser").lean(),
    ]);
    res.setHeader("Content-Disposition", 'attachment; filename="blue-satchel-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: req.user.toSafeObject(),
      scans,
      orders,
      creditTransactions,
      supportChat,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/me — permanently deletes the account, its scans and the
// scan photos. Orders and credit transactions are kept: they are payment
// records we must retain, and they no longer link to any account.
export const deleteMyAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts can't be deleted here." });
    }

    // Re-confirm it's really them: password for email accounts, the word
    // DELETE for Google accounts (which have no password).
    if (user.password) {
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!password || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: "That password is incorrect." });
      }
    } else if (req.body?.confirm !== "DELETE") {
      return res.status(400).json({ message: 'Type "DELETE" to confirm.' });
    }

    const scans = await ScanHistory.find({ user: user._id }).select("imageUrl leftImageUrl rightImageUrl rawMetrics").lean();
    scans.flatMap(imageUrlsOf).forEach(removeUpload);
    removeUpload(user.avatarUrl);

    await ScanHistory.deleteMany({ user: user._id });
    await SupportThread.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({ message: "Your account and scans have been deleted." });
  } catch (err) {
    next(err);
  }
};
