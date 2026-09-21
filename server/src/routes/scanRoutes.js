import { Router } from "express";
import { createScan, listMyScans, getScan } from "../controllers/scanController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

const uploadAngles = upload.fields([
  { name: "front", maxCount: 1 },
  { name: "left", maxCount: 1 },
  { name: "right", maxCount: 1 },
]);

router.use(protect);
router.post("/", uploadAngles, createScan);
router.get("/", listMyScans);
router.get("/:id", getScan);

export default router;
