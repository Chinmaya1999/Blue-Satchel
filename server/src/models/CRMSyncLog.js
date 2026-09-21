import mongoose from "mongoose";

const crmSyncLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ["customer", "order"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    provider: { type: String, default: "mock" },
    remoteId: String,
    status: { type: String, enum: ["success", "failed"], default: "success" },
    payload: mongoose.Schema.Types.Mixed,
    message: String,
  },
  { timestamps: true }
);

export default mongoose.model("CRMSyncLog", crmSyncLogSchema);
