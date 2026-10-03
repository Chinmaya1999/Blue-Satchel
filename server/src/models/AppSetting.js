import mongoose from "mongoose";

// Site-wide switches controlled from the admin console. A single document
// (key "global") — see services/settings.js.
const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    // When true, Quick Scan costs no credits and anyone signed in can run it.
    quickScanFree: { type: Boolean, default: false },
    // Same for Detailed Scan.
    detailedScanFree: { type: Boolean, default: false },
    // Same for Focus Scan.
    focusScanFree: { type: Boolean, default: false },
    // Availability of each scan service. When false the scan is switched off
    // for everyone (customers and salons) until an admin turns it back on.
    quickScanEnabled: { type: Boolean, default: true },
    detailedScanEnabled: { type: Boolean, default: true },
    focusScanEnabled: { type: Boolean, default: true },
    // When false the shop is a catalog only: products can be viewed but not
    // bought (no bag, checkout or orders). Admins switch it on to sell.
    shopEnabled: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("AppSetting", appSettingSchema);
