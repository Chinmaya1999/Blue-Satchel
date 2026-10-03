import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["scan", "product"], required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "SalonProduct" },
    name: { type: String, required: true },
    qty: { type: Number, default: 1, min: 1 },
    unitPaise: { type: Number, required: true, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Invoice a salon gives a customer for a scan plus any products. Items are
// snapshots, so later price changes never rewrite an issued bill.
const salonBillSchema = new mongoose.Schema(
  {
    salon: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true, index: true },
    scan: { type: mongoose.Schema.Types.ObjectId, ref: "ScanHistory", required: true, unique: true },
    invoiceNumber: { type: String, required: true },
    customer: { name: String, phone: String, email: String },
    items: { type: [itemSchema], default: [] },
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paymentMethod: { type: String, enum: ["cash", "upi", "card", "other"] },
    paidAt: Date,
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model("SalonBill", salonBillSchema);
