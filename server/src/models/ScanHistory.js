import mongoose from "mongoose";

const concernSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    severity: { type: Number, required: true, min: 0, max: 100 },
    level: { type: String, enum: ["Low", "Medium", "High"], required: true },
  },
  { _id: false }
);

const scanHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageUrl: { type: String, required: true },
    leftImageUrl: { type: String },
    rightImageUrl: { type: String },
    provider: { type: String, default: "mock" },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    overallLabel: { type: String, required: true },
    concerns: { type: [concernSchema], default: [] },
    recommendedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    rawMetrics: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model("ScanHistory", scanHistorySchema);
