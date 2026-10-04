import mongoose from "mongoose";
import { CONCERN_TAGS } from "./Product.js";

// A product the salon sells itself (separate from the DXB Beauty shop).
const salonProductSchema = new mongoose.Schema(
  {
    salon: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 1000 },
    imageUrl: String,
    pricePaise: { type: Number, required: true, min: 0, max: 100000000 },
    // Skin concerns it helps with — used to suggest it after a scan.
    concerns: { type: [String], enum: CONCERN_TAGS, default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("SalonProduct", salonProductSchema);
