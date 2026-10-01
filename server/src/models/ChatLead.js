import mongoose from "mongoose";

// One chatbot conversation. It doubles as the lead record: whatever the
// visitor shared (skin profile, contact details) is stored on it so the team
// can follow up, and `state` is what lets the conversation resume.
const chatLeadSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    state: { type: mongoose.Schema.Types.Mixed, default: {} },

    name: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    skinType: String,
    concerns: [String],
    sensitive: Boolean,
    ageBand: String,
    budget: String,
    // Only true when the visitor agreed to be contacted with their details.
    contactConsent: { type: Boolean, default: false },

    recommended: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    completed: { type: Boolean, default: false },
    // Safety flag: the visitor described something that needs a doctor.
    needsDermatologist: { type: Boolean, default: false },
    messages: [{ role: { type: String, enum: ["bot", "user"] }, text: String, _id: false }],
  },
  { timestamps: true }
);

chatLeadSchema.index({ createdAt: -1 });

export default mongoose.model("ChatLead", chatLeadSchema);
