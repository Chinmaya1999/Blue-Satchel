import { Router } from "express";
import {
  createOrder,
  quoteOrder,
  verifyOrderPayment,
  markOrderPaymentFailed,
  listMyOrders,
  getMyOrder,
} from "../controllers/orderController.js";
import { protect } from "../middleware/auth.js";
import { paymentLimiter } from "../middleware/security.js";

const router = Router();

router.use(protect);
router.post("/quote", quoteOrder);
router.post("/", paymentLimiter, createOrder);
router.post("/:id/verify", paymentLimiter, verifyOrderPayment);
router.post("/:id/payment-failed", paymentLimiter, markOrderPaymentFailed);
router.get("/", listMyOrders);
router.get("/:id", getMyOrder);

export default router;
