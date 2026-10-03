import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import creditRoutes from "./routes/creditRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import salonRoutes from "./routes/salonRoutes.js";
import publicSalonRoutes from "./routes/publicSalonRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { sanitizeBody, apiLimiter } from "./middleware/security.js";
import { getSettings } from "./services/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// nginx is the only proxy in front of this server, so trust exactly one hop:
// req.ip is then the real visitor (used by the rate limits).
app.set("trust proxy", 1);
// Plain key=value query strings only — no nested objects like ?q[$ne]=x.
app.set("query parser", "simple");

// Security headers. Same-site resource policy still lets the site show the
// scan photos in /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));

// The site calls the API on its own origin (nginx in production, the Vite
// proxy in development), so cross-origin access is off unless CLIENT_URL
// lists extra origins (comma-separated).
const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));

app.use(express.json({ limit: "2mb" }));
app.use(sanitizeBody);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), { dotfiles: "deny", index: false }));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "blue-satchel-business-platform" }));

app.use("/api", apiLimiter);

// Switches the storefront needs (no auth): whether the shop sells, and
// whether Quick Scan is free.
app.get("/api/settings", (req, res) => {
  const s = getSettings();
  res.json({
    shopEnabled: s.shopEnabled,
    quickScanFree: s.quickScanFree,
    detailedScanFree: s.detailedScanFree,
    focusScanFree: s.focusScanFree,
    quickScanEnabled: s.quickScanEnabled,
    detailedScanEnabled: s.detailedScanEnabled,
    focusScanEnabled: s.focusScanEnabled,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/salon", salonRoutes);
app.use("/api/salons", publicSalonRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
