import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { syncProductCatalog } from "./services/catalogSync.js";
import { loadSettings, startSettingsRefresh } from "./services/settings.js";
import { seedDefaultPlans } from "./services/credits.js";

const PORT = process.env.PORT || 5000;

// Refuse to start with settings that would make the site insecure or broken.
const REQUIRED = ["MONGO_URI", "JWT_SECRET"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[server] Missing required settings: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32 || /change_this/i.test(process.env.JWT_SECRET)) {
  console.error("[server] JWT_SECRET must be a long random string (32+ characters).");
  process.exit(1);
}

connectDB().then(async () => {
  // A failed sync shouldn't take the API down — the existing catalogue still serves.
  await syncProductCatalog().catch((err) => console.error("[catalog] Sync failed:", err.message));
  // Scan pricing depends on these; defaults (Quick Scan paid) apply if this fails.
  await loadSettings().catch((err) => console.error("[settings] Load failed:", err.message));
  startSettingsRefresh();
  await seedDefaultPlans().catch((err) => console.error("[credits] Plan seed failed:", err.message));
  app.listen(PORT, () => {
    console.log(`[server] DXB BEAUTY Business Platform running on http://localhost:${PORT}`);
  });
});
