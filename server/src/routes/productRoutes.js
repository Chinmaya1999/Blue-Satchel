import { Router } from "express";
import { listProducts, listBrands, getProduct } from "../controllers/productController.js";

const router = Router();

router.get("/", listProducts);
router.get("/brands", listBrands);
router.get("/:id", getProduct);

export default router;
