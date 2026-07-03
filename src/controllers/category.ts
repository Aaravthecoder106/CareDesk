import { AuthRequest } from "../types";
import { successResponse, errorResponse } from "../utils/responses";
import { categoryService } from "../services/category";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getCategories = async (req: AuthRequest, res: any) => {
  try {
    const categories = await categoryService.getCategories(req.userId!);
    res.json(successResponse(categories));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const createCategory = async (req: AuthRequest, res: any) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json(errorResponse("name is required and must be a string"));
    }
    if (name.length > 50) {
      return res.status(400).json(errorResponse("name must be 50 characters or less"));
    }
    const category = await categoryService.createCategory(req.userId!, name, color);
    res.status(201).json(successResponse(category, "Category created"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const updateCategory = async (req: AuthRequest, res: any) => {
  try {
    const categoryId = String(req.params.categoryId);
    if (!UUID_REGEX.test(categoryId)) {
      return res.status(400).json(errorResponse("Invalid categoryId"));
    }
    const { name, color } = req.body;
    const category = await categoryService.updateCategory(req.userId!, categoryId, { name, color });
    res.json(successResponse(category, "Category updated"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const deleteCategory = async (req: AuthRequest, res: any) => {
  try {
    const categoryId = String(req.params.categoryId);
    if (!UUID_REGEX.test(categoryId)) {
      return res.status(400).json(errorResponse("Invalid categoryId"));
    }
    const result = await categoryService.deleteCategory(req.userId!, categoryId);
    res.json(successResponse(result));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};
