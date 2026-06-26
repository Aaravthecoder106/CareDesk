import prisma from "../utils/prisma";
import { UsageAction } from "@prisma/client";

const FREE_LIMITS = {
  REPORTS: 3,
  FAMILY_MEMBERS: 1,
};

export class UsageService {
  async trackAction(userId: string, action: UsageAction) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await prisma.usageTracker.upsert({
      where: {
        userId_action_period: { userId, action, period },
      },
      update: { count: { increment: 1 } },
      create: { userId, action, period, count: 1 },
    });
  }

  async getUsage(userId: string, action: UsageAction) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const usage = await prisma.usageTracker.findUnique({
      where: {
        userId_action_period: { userId, action, period },
      },
    });

    return usage?.count || 0;
  }

  async checkPaywall(
    userId: string,
    trigger: "UPLOAD_REPORT" | "ADD_FAMILY_MEMBER"
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.plan !== "FREE") return { blocked: false };

    switch (trigger) {
      case "UPLOAD_REPORT": {
        const count = await prisma.report.count({ where: { userId } });
        return {
          blocked: count >= FREE_LIMITS.REPORTS,
          current: count,
          limit: FREE_LIMITS.REPORTS,
          message: "Free plan limited to 3 reports. Upgrade to Premium for unlimited uploads.",
        };
      }
      case "ADD_FAMILY_MEMBER": {
        const count = await prisma.familyMember.count({ where: { userId } });
        return {
          blocked: count >= FREE_LIMITS.FAMILY_MEMBERS,
          current: count,
          limit: FREE_LIMITS.FAMILY_MEMBERS,
          message: "Free plan limited to 1 family member. Upgrade to Premium for up to 6.",
        };
      }
      default:
        return { blocked: false };
    }
  }
}

export const usageService = new UsageService();
