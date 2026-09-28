import { Router } from "express";
import { register, login, googleLogin, getAuthConfig, getMe, updateMe, markNotificationRead } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/config", getAuthConfig);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/me/notifications/:id/read", protect, markNotificationRead);

export default router;
