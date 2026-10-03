import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { salonUpload } from "../middleware/upload.js";
import { scanLimiter } from "../middleware/security.js";
import * as c from "../controllers/salonController.js";

const router = Router();
router.use(protect, c.loadSalon);

router.get("/me", c.getMySalon);
router.put("/me", c.updateMySalon);
router.post("/upload", salonUpload.single("image"), c.uploadImage);
router.get("/stats", c.getStats);

router.get("/pricing", c.getPricing);
router.put("/scan-prices", c.setScanPrices);

router.get("/products", c.listProducts);
router.post("/products", c.createProduct);
router.put("/products/:id", c.updateProduct);
router.delete("/products/:id", c.deleteProduct);

router.post(
  "/scans",
  scanLimiter,
  salonUpload.fields([{ name: "front", maxCount: 1 }, { name: "left", maxCount: 1 }, { name: "right", maxCount: 1 }]),
  c.createSalonScan
);
router.get("/scans", c.listSalonScans);
router.get("/scans/:id", c.getSalonScan);
router.put("/scans/:id/recommendations", c.setRecommendations);
router.post("/scans/:id/bill", c.createBill);

router.get("/bills", c.listBills);
router.get("/bills/:id", c.getBill);
router.patch("/bills/:id", c.updateBill);

export default router;
