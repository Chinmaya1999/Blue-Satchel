import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { syncProductCatalog } from "./services/catalogSync.js";

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // A failed sync shouldn't take the API down — the existing catalogue still serves.
  await syncProductCatalog().catch((err) => console.error("[catalog] Sync failed:", err.message));
  app.listen(PORT, () => {
    console.log(`[server] Blue Satchel Business Platform running on http://localhost:${PORT}`);
  });
});
