import prisma from "../utils/prisma";
import { UsageAction, Plan } from "@prisma/client";

const PLAN_LIMITS: Record<Plan, { reports: number; familyMembers: number }> = {
  FREE: { reports: 3, familyMembers: 1 },
  BASIC: { reports: 10, familyMembers: 2 },
  PREMIUM: { reports: -1, familyMembers: 4 },
  FAMILY: { reports: -1, familyMembers: 6 },
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

    const limits = PLAN_LIMITS[user.plan];

    switch (trigger) {
      case "UPLOAD_REPORT": {
        if (limits.reports === -1) return { blocked: false };
        const count = await prisma.report.count({ where: { userId } });
        return {
          blocked: count >= limits.reports,
          current: count,
          limit: limits.reports,
          message: `Your ${user.plan} plan allows ${limits.reports} reports. Upgrade for more.`,
        };
      }
      case "ADD_FAMILY_MEMBER": {
        if (limits.familyMembers === -1) return { blocked: false };
        const count = await prisma.familyMember.count({ where: { userId } });
        return {
          blocked: count >= limits.familyMembers,
          current: count,
          limit: limits.familyMembers,
          message: `Your ${user.plan} plan allows ${limits.familyMembers} family members. Upgrade for more.`,
        };
      }
      default:
        return { blocked: false };
    }
  }
}

export const usageService = new UsageService();
