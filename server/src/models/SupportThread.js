import mongoose from "mongoose";

// One live conversation per customer with the Blue Satchel team. The customer
// writes from the chat widget, an admin answers from the admin console.
// `unreadForAdmin` / `unreadForUser` count messages the other side hasn't
// opened yet; they drive the admin bell and the customer's chat badge.
const supportThreadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    messages: [
      {
        sender: { type: String, enum: ["user", "admin"], required: true },
        text: { type: String, required: true, maxlength: 2000 },
        // Which admin replied (shown to the customer as the team, not by name).
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessageText: { type: String, default: "" },
    lastSender: { type: String, enum: ["user", "admin"] },
    unreadForAdmin: { type: Number, default: 0 },
    unreadForUser: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("SupportThread", supportThreadSchema);
