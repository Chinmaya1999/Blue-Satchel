import { Router } from "express";
import {
  register,
  login,
  googleLogin,
  getAuthConfig,
  getMe,
  updateMe,
  acceptPhotoConsent,
  markNotificationRead,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../controllers/authController.js";
import { exportMyData, deleteMyAccount } from "../controllers/accountController.js";
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
router.post("/me/consent", protect, acceptPhotoConsent);
router.get("/me/export", protect, exportMyData);
// Password check inside — rate-limited like the other credential endpoints.
router.delete("/me", authLimiter, protect, deleteMyAccount);
router.patch("/me/notifications/:id/read", protect, markNotificationRead);

export default router;
