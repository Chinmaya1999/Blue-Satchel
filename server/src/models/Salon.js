import mongoose from "mongoose";

const hoursSchema = new mongoose.Schema(
  { day: String, open: String, close: String, closed: { type: Boolean, default: false } },
  { _id: false }
);

// A salon registered on DXB BEAUTY. `owner` is the User (role "salon") who
// runs it and pays for scans with their own credits. All money is in paise.
// Only salons an admin has approved appear on the public site.
const salonSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true },
    tagline: { type: String, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000 },
    logoUrl: String,
    coverUrl: String,
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20 },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: "India" },
    },
    location: { lat: Number, lng: Number },
    services: { type: [String], default: [] },
    hours: { type: [hoursSchema], default: [] },
    // What the salon charges its own customers per scan, by scan mode.
    scanPrices: {
      quick: { type: Number, min: 0, max: 100000000, default: 0 },
      focus: { type: Number, min: 0, max: 100000000, default: 0 },
      detailed: { type: Number, min: 0, max: 100000000, default: 0 },
    },
    // Set once name, address, phone and map location are filled in.
    profileComplete: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "suspended"], default: "pending", index: true },
    featured: { type: Boolean, default: false },
    adminNote: { type: String, trim: true, maxlength: 500 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    billCounter: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Salon", salonSchema);
