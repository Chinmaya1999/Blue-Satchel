import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  getOverview,
  listCustomers,
  getCustomer,
  listAllScans,
  deleteScan,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductsAdmin,
  listAllOrders,
  updateOrderStatus,
  listCrmLogs,
} from "../controllers/adminController.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/overview", getOverview);

router.get("/customers", listCustomers);
router.get("/customers/:id", getCustomer);

router.get("/scans", listAllScans);
router.delete("/scans/:id", deleteScan);

router.get("/products", listProductsAdmin);
router.post("/products", createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

router.get("/orders", listAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

router.get("/crm-logs", listCrmLogs);

export default router;
