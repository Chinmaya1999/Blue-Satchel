import { Router } from "express";
import { getMyThread, getMyUnread, sendMyMessage } from "../controllers/supportController.js";
import { protect } from "../middleware/auth.js";
import { chatLimiter } from "../middleware/security.js";

const router = Router();

router.use(protect);
router.get("/me", getMyThread);
router.get("/me/unread", getMyUnread);
router.post("/me/messages", chatLimiter, sendMyMessage);

export default router;
