import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { listSalons, getSalon, reviewSalon } from "../controllers/publicSalonController.js";

const router = Router();
router.get("/", listSalons);
router.get("/:slug", getSalon);
router.post("/:slug/reviews", protect, reviewSalon);

export default router;
