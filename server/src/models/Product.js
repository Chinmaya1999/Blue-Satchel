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
];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "Blue Satchel" },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["cleanser", "serum", "moisturizer", "sunscreen", "treatment", "toner", "mask"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    imageUrl: { type: String, required: true },
    images: [String],
    tags: { type: [String], enum: CONCERN_TAGS, default: [] },
    skinTypes: {
      type: [String],
      enum: ["normal", "oily", "dry", "combination", "sensitive"],
      default: [],
    },
    ingredients: [String],
    stock: { type: Number, default: 100, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    bestseller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ tags: 1 });
productSchema.index({ name: "text", description: "text", brand: "text" });

export default mongoose.model("Product", productSchema);
