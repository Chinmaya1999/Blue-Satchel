import mongoose from "mongoose";

export const CONCERN_TAGS = [
  "spots",
  "pores",
  "texture",
  "redness",
  "dark-circles",
  "hydration",
  "anti-aging",
  "acne",
  "brightening",
  "wrinkles",
  "firmness",
  "oiliness",
  "eye-bags",
];

export const PRODUCT_CATEGORIES = ["cleanser", "toner", "serum", "treatment", "eye-care", "moisturizer", "sunscreen", "mask"];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "DXB BEAUTY" },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    imageUrl: { type: String, required: true },
    // Brand's official product page, for real third-party products.
    productUrl: { type: String, trim: true },
    images: [String],
    tags: { type: [String], enum: CONCERN_TAGS, default: [] },
    skinTypes: {
      type: [String],
      enum: ["normal", "oily", "dry", "combination", "sensitive"],
      default: [],
    },
    ingredients: [String],
    stock: { type: Number, default: 100, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    bestseller: { type: Boolean, default: false },
    // DXB BEAUTY's own products: always part of a routine and listed first in the shop.
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ tags: 1 });
productSchema.index({ name: "text", description: "text", brand: "text" });

export default mongoose.model("Product", productSchema);
