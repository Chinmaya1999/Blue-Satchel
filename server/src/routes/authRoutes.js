import { Router } from "express";
import { register, login, getMe, updateMe, markNotificationRead } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/me/notifications/:id/read", protect, markNotificationRead);

export default router;
