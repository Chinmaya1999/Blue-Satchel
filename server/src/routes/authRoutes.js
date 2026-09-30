import { Router } from "express";
import {
  register,
  login,
  googleLogin,
  getAuthConfig,
  getMe,
  updateMe,
  markNotificationRead,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter, verifyLimiter } from "../middleware/security.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleLogin);
router.post("/forgot-password", verifyLimiter, forgotPassword);
router.post("/verify-reset-code", verifyLimiter, verifyResetCode);
router.post("/reset-password", verifyLimiter, resetPassword);
router.get("/config", getAuthConfig);
router.get("/me", protect, getMe);
router.post("/verify-email", verifyLimiter, protect, verifyEmail);
router.post("/resend-code", verifyLimiter, protect, resendVerificationCode);
router.patch("/me", protect, updateMe);
router.patch("/me/notifications/:id/read", protect, markNotificationRead);

export default router;
