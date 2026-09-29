import { Router } from "express";
import {
  getPlans,
  getMyCredits,
  createCreditOrder,
  verifyCreditPayment,
  markPaymentFailed,
} from "../controllers/creditController.js";
import { protect } from "../middleware/auth.js";
import { paymentLimiter } from "../middleware/security.js";

const router = Router();

router.get("/plans", getPlans);
router.get("/me", protect, getMyCredits);
router.post("/order", paymentLimiter, protect, createCreditOrder);
router.post("/verify", paymentLimiter, protect, verifyCreditPayment);
router.post("/failed", paymentLimiter, protect, markPaymentFailed);

export default router;
