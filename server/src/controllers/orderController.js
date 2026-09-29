import crypto from "crypto";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { crmService } from "../services/crmService.js";
import {
  isRazorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
  verifyRazorpaySignature,
} from "../services/razorpay.js";

/**
 * Shop orders. Two ways to pay:
 *  - "cod": stock is reserved and the order confirmed straight away; payment
 *    is collected on delivery (paymentStatus stays "pending").
 *  - "razorpay": the order is created unpaid, the customer pays in Razorpay
 *    Checkout, and only a verified payment signature confirms the order and
 *    reserves stock. Unpaid online orders never reach the customer's list.
 * Prices always come from the database, never from the client.
 */

const SHIPPING_FEE = 49;
const FREE_SHIPPING_OVER = 999;
const TAX_RATE = 0.18;
const MAX_LINES = 50;
const MAX_QTY = 20;

const generateOrderNumber = () => `BS-${new Date().getFullYear()}${crypto.randomInt(100000, 1000000)}`;

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const cleanAddress = (a = {}) => ({
  line1: str(a.line1),
  line2: str(a.line2),
  city: str(a.city, 100),
  state: str(a.state, 100),
  postalCode: str(a.postalCode, 20),
  country: str(a.country, 100) || "India",
});

const fail = (status, message) => Object.assign(new Error(message), { status });

// Prices, names and availability from the database for the requested items.
const priceCart = async (items) => {
  if (!Array.isArray(items) || items.length === 0) throw fail(400, "Your bag is empty.");
  if (items.length > MAX_LINES) throw fail(400, "Too many different items in one order.");

  const qtyById = new Map();
  for (const item of items) {
    const id = str(item?.productId, 48);
    if (!/^[a-f\d]{24}$/i.test(id)) throw fail(400, "Your bag has an invalid item. Please refresh and try again.");
    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(item.quantity, 10) || 1));
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }

  const products = await Product.find({ _id: { $in: [...qtyById.keys()] }, isActive: true });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const orderItems = [];
  let subtotal = 0;
  for (const [id, quantity] of qtyById) {
    const product = byId.get(id);
    if (!product) throw fail(400, "An item in your bag is no longer available. Please remove it and try again.");
    if (product.stock < quantity) throw fail(400, `Only ${product.stock} of “${product.name}” left in stock.`);
    subtotal += product.price * quantity;
    orderItems.push({ product: product._id, name: product.name, imageUrl: product.imageUrl, price: product.price, quantity });
  }

  const shippingFee = subtotal > FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  const tax = Math.round(subtotal * TAX_RATE);
  return { orderItems, subtotal, shippingFee, tax, total: subtotal + shippingFee + tax };
};

// Takes stock for every line atomically (a line only decrements if enough is
// left), rolling back the lines already taken if any one can't be filled.
const reserveStock = async (orderItems) => {
  const taken = [];
  for (const item of orderItems) {
    const res = await Product.updateOne({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } });
    if (res.modifiedCount !== 1) {
      await Promise.all(taken.map((t) => Product.updateOne({ _id: t.product }, { $inc: { stock: t.quantity } })));
      return false;
    }
    taken.push(item);
  }
  return true;
};

// CRM sync + customer notification once an order is confirmed.
const finalizeOrder = async (order, user) => {
  await crmService.syncOrder(order, user);
  await Order.updateOne({ _id: order._id }, { crmSynced: true });
  await User.updateOne(
    { _id: user._id },
    { $push: { notifications: { title: "Order confirmed", message: `Order ${order.orderNumber} has been placed successfully.` } } }
  );
};

export const createOrder = async (req, res, next) => {
  try {
    const paymentMethod = req.body.paymentMethod === "cod" ? "cod" : "razorpay";
    const shippingAddress = cleanAddress(req.body.shippingAddress);
    if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      return res.status(400).json({ message: "A complete shipping address is required." });
    }
    const priced = await priceCart(req.body.items);

    if (paymentMethod === "cod") {
      if (!(await reserveStock(priced.orderItems))) {
        return res.status(409).json({ message: "Some items just sold out. Please review your bag and try again." });
      }
      const order = await Order.create({
        ...priced,
        items: priced.orderItems,
        orderNumber: generateOrderNumber(),
        user: req.user._id,
        shippingAddress,
        paymentMethod,
        paymentStatus: "pending",
        status: "confirmed",
      });
      await finalizeOrder(order, req.user);
      return res.status(201).json({ order });
    }

    if (!isRazorpayConfigured()) return res.status(503).json({ message: "Online payment isn't available right now. Please choose Cash on Delivery." });

    const order = await Order.create({
      ...priced,
      items: priced.orderItems,
      orderNumber: generateOrderNumber(),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      status: "placed",
    });
    // Shop prices are in rupees, so shop orders are always charged in INR.
    const rzp = await createRazorpayOrder({
      amount: priced.total,
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: String(order._id), userId: String(req.user._id) },
    });
    order.razorpayOrderId = rzp.id;
    await order.save();

    res.status(201).json({
      order,
      razorpay: { orderId: rzp.id, amount: rzp.amount, currency: rzp.currency, keyId: razorpayKeyId() },
    });
  } catch (err) {
    next(err);
  }
};

// Razorpay Checkout succeeded — verify the signature, then confirm the order.
export const verifyOrderPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id: rzpOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!verifyRazorpaySignature(rzpOrderId, paymentId, signature)) {
      return res.status(400).json({ message: "Payment verification failed. If you were charged, please contact support." });
    }

    // Flip unpaid → paid in one atomic step so a repeated call can't confirm twice.
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, razorpayOrderId: rzpOrderId, paymentStatus: { $ne: "paid" } },
      { paymentStatus: "paid", status: "confirmed", razorpayPaymentId: paymentId, paymentReference: paymentId, paymentMessage: "Payment captured" },
      { new: true }
    );
    if (!order) {
      const already = await Order.findOne({ _id: req.params.id, user: req.user._id, razorpayOrderId: rzpOrderId, paymentStatus: "paid" });
      if (already) return res.json({ order: already });
      return res.status(404).json({ message: "Order not found." });
    }

    // Paid, so the order stands even if stock ran out meanwhile — flag it
    // for the team to resolve rather than failing a completed payment.
    if (!(await reserveStock(order.items))) {
      console.error(`[orders] ${order.orderNumber} paid but stock ran out — needs manual follow-up`);
      order.paymentMessage = "Paid — stock ran out before confirmation; needs follow-up";
      await order.save();
    }
    await finalizeOrder(order, req.user);
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

// Checkout reported a failed attempt (the customer may still retry it).
export const markOrderPaymentFailed = async (req, res, next) => {
  try {
    await Order.updateOne(
      { _id: req.params.id, user: req.user._id, paymentStatus: "pending", paymentMethod: "razorpay" },
      { paymentStatus: "failed", paymentMessage: str(req.body.reason, 300) || "Payment failed" }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Online orders that were never paid are left out.
const visibleToCustomer = { $or: [{ paymentMethod: { $ne: "razorpay" } }, { paymentStatus: "paid" }] };

export const listMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id, ...visibleToCustomer }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

export const getMyOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id, ...visibleToCustomer });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json({ order });
  } catch (err) {
    next(err);
  }
};
