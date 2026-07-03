import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../controllers/category";

const router = Router();
router.use(authenticate);

router.get("/", getCategories);
router.post("/", createCategory);
router.patch("/:categoryId", updateCategory);
router.delete("/:categoryId", deleteCategory);

export default router;
