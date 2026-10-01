import { Router } from "express";
import { createScan, listMyScans, getScan, getScanQuota, nearbyDermatologists } from "../controllers/scanController.js";
import { scanAdvisor } from "../controllers/advisorController.js";
import { chatLimiter } from "../middleware/security.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { scanLimiter } from "../middleware/security.js";

const router = Router();

const uploadAngles = upload.fields([
  { name: "front", maxCount: 1 },
  { name: "left", maxCount: 1 },
  { name: "right", maxCount: 1 },
]);

router.use(protect);
router.post("/", scanLimiter, uploadAngles, createScan);
router.get("/", listMyScans);
router.get("/quota", getScanQuota);
router.get("/dermatologists", nearbyDermatologists);
router.get("/:id", getScan);
router.post("/:id/advisor", chatLimiter, scanAdvisor);

export default router;
