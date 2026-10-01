import { Router } from "express";
import { startChat, sendMessage } from "../controllers/chatController.js";
import { chatLimiter } from "../middleware/security.js";

const router = Router();

router.post("/start", chatLimiter, startChat);
router.post("/message", chatLimiter, sendMessage);

export default router;
