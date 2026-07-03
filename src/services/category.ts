import prisma from "../utils/prisma";

export class CategoryService {
  async getCategories(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { reports: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createCategory(userId: string, name: string, color?: string) {
    if (!name || name.trim().length === 0) throw new Error("Name is required");
    if (name.length > 50) throw new Error("Name must be 50 characters or less");
    
    // Check max 20 categories per user
    const count = await prisma.category.count({ where: { userId } });
    if (count >= 20) throw new Error("Maximum 20 categories allowed");

    return prisma.category.create({
      data: {
        userId,
        name: name.trim(),
        color: color || "#5E78E6",
      },
    });
  }

  async updateCategory(userId: string, categoryId: string, data: { name?: string; color?: string }) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) throw new Error("Category not found");

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) throw new Error("Name cannot be empty");
      if (data.name.length > 50) throw new Error("Name must be 50 characters or less");
    }

    return prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.color && { color: data.color }),
      },
    });
  }

  async deleteCategory(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) throw new Error("Category not found");

    // Set reports' categoryId to null before deleting
    await prisma.report.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });

    await prisma.category.delete({ where: { id: categoryId } });
    return { message: "Category deleted" };
  }
}

export const categoryService = new CategoryService();
