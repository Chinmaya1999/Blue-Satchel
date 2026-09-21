import { Router } from "express";
import { createOrder, listMyOrders, getMyOrder } from "../controllers/orderController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.post("/", createOrder);
router.get("/", listMyOrders);
router.get("/:id", getMyOrder);

export default router;
