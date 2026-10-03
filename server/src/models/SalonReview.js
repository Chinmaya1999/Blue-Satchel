import mongoose from "mongoose";

const salonReviewSchema = new mongoose.Schema(
  {
    salon: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);
salonReviewSchema.index({ salon: 1, user: 1 }, { unique: true });

export default mongoose.model("SalonReview", salonReviewSchema);
