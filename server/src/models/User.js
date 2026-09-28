import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "India" },
  },
  { _id: false }
);

// Where the user was when they signed up. `source` records how it was found:
// "gps" = browser geolocation the user allowed, "ip" = approximate, from the
// request IP when they didn't.
const locationSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    accuracy: Number, // metres, GPS only
    source: { type: String, enum: ["gps", "ip"] },
    city: String,
    region: String,
    country: String,
    displayName: String,
    ip: String,
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Google accounts have no password.
    password: {
      type: String,
      required() {
        return this.authProvider === "local";
      },
      minlength: 6,
      select: false,
    },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, index: { unique: true, sparse: true } },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    skinType: {
      type: String,
      enum: ["normal", "oily", "dry", "combination", "sensitive", "unknown"],
      default: "unknown",
    },
    dateOfBirth: Date,
    avatarUrl: String,
    address: addressSchema,
    signupLocation: locationSchema,
    // Scans used on `day` (YYYY-MM-DD, India time) — see services/scanQuota.js.
    scanQuota: {
      day: String,
      count: { type: Number, default: 0 },
    },
    crmContactId: { type: String, default: null },
    notifications: [
      {
        title: String,
        message: String,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);
