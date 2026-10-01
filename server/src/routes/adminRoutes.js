import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { listChatLeads } from "../controllers/chatController.js";
import { listPlans, createPlan, updatePlan, deletePlan } from "../controllers/planController.js";
import {
  getOverview,
  listCustomers,
  getCustomer,
  updateUser,
  deleteUser,
  listUserLocations,
  getScanAdmin,
  listAllScans,
  deleteScan,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductsAdmin,
  listAllOrders,
  updateOrderStatus,
  listCrmLogs,
  listCreditTransactions,
  adjustUserCredits,
  getAppSettings,
  updateAppSettings,
} from "../controllers/adminController.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/overview", getOverview);

router.get("/customers", listCustomers);
router.get("/customers/locations", listUserLocations);
router.get("/customers/:id", getCustomer);
router.patch("/customers/:id", updateUser);
router.delete("/customers/:id", deleteUser);
router.post("/customers/:id/credits", adjustUserCredits);

router.get("/credits", listCreditTransactions);
router.get("/chat-leads", listChatLeads);

router.get("/plans", listPlans);
router.post("/plans", createPlan);
router.patch("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

router.get("/settings", getAppSettings);
router.patch("/settings", updateAppSettings);

router.get("/scans", listAllScans);
router.get("/scans/:id", getScanAdmin);
router.delete("/scans/:id", deleteScan);

router.get("/products", listProductsAdmin);
router.post("/products", createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

router.get("/orders", listAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

router.get("/crm-logs", listCrmLogs);

export default router;
