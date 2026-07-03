import prisma from "../utils/prisma";

export class AlertService {
  async getAlerts(userId: string, unreadOnly = false, page = 1, limit = 50) {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * safeLimit;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: {
          userId,
          ...(unreadOnly && { read: false }),
        },
        include: {
          familyMember: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.alert.count({
        where: {
          userId,
          ...(unreadOnly && { read: false }),
        },
      }),
    ]);

    return {
      data: alerts,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async markAsRead(userId: string, alertId: string) {
    // Use transaction to prevent TOCTOU race condition
    return await prisma.$transaction(async (tx) => {
      const alert = await tx.alert.findFirst({
        where: { id: alertId, userId },
      });
      if (!alert) throw new Error("Alert not found");

      return tx.alert.update({
        where: { id: alertId },
        data: { read: true, readAt: new Date() },
      });
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.alert.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    return { message: "All alerts marked as read" };
  }

  async createAlert(
    familyMemberId: string,
    userId: string,
    type: "MEDICATION" | "ABNORMAL" | "APPOINTMENT",
    title: string,
    message: string
  ) {
    const safeTitle = (title || "").substring(0, 500);
    const safeMessage = (message || "").substring(0, 5000);

    return prisma.alert.create({
      data: {
        familyMemberId,
        userId,
        alertType: type,
        title: safeTitle,
        message: safeMessage,
      },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.alert.count({
      where: { userId, read: false },
    });
    return { unreadCount: count };
  }
}

export const alertService = new AlertService();
