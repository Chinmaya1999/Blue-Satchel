import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { chargePayment } from "../services/paymentService.js";
import { crmService } from "../services/crmService.js";

const SHIPPING_FEE = 49;
const TAX_RATE = 0.18;

const generateOrderNumber = () =>
  `BS-${new Date().getFullYear()}${(Math.random() * 900000 + 100000).toFixed(0)}`;

export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = "card", card, upiId } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }
    if (!shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.postalCode) {
      return res.status(400).json({ message: "A complete shipping address is required." });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) return res.status(400).json({ message: `Product ${item.productId} is unavailable.` });
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      if (product.stock < qty) {
        return res.status(400).json({ message: `${product.name} has insufficient stock.` });
      }
      const lineTotal = product.price * qty;
      subtotal += lineTotal;
      orderItems.push({
        product: product._id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        quantity: qty,
      });
    }

    const shippingFee = subtotal > 999 ? 0 : SHIPPING_FEE;
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + shippingFee + tax;

    const paymentResult = await chargePayment({ method: paymentMethod, amount: total, card, upiId });
    if (!paymentResult.success) {
      return res.status(402).json({ message: paymentResult.message || "Payment failed." });
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user._id,
      items: orderItems,
      subtotal,
      shippingFee,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
      paymentReference: paymentResult.reference,
      status: "confirmed",
    });

    await Promise.all(
      orderItems.map((item) =>
        Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } })
      )
    );

    await crmService.syncOrder(order, req.user);
    order.crmSynced = true;
    await order.save();

    req.user.notifications.push({
      title: "Order confirmed",
      message: `Order ${order.orderNumber} has been placed successfully.`,
    });
    await req.user.save();

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
};

export const listMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

export const getMyOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json({ order });
  } catch (err) {
    next(err);
  }
};
