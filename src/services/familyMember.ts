import prisma from "../utils/prisma";
import { usageService } from "./usage";

export class FamilyMemberService {
  async getMembers(userId: string) {
    return prisma.familyMember.findMany({
      where: { userId },
      include: {
        medications: { where: { active: true } },
        _count: { select: { reports: true, visits: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getMember(userId: string, memberId: string) {
    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, userId },
      include: {
        medications: { where: { active: true } },
        _count: { select: { reports: true, visits: true } },
      },
    });

    if (!member) throw new Error("Family member not found");
    return member;
  }

  async createMember(
    userId: string,
    data: { name: string; relationship: string; dateOfBirth?: string }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      throw new Error("Name is required");
    }
    if (data.name.length > 100) {
      throw new Error("Name must be 100 characters or less");
    }
    if (!data.relationship || typeof data.relationship !== "string") {
      throw new Error("Relationship is required");
    }
    if (data.relationship.length > 255) {
      throw new Error("Relationship must be 255 characters or less");
    }

    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw new Error("Invalid date of birth");
      }
      if (dob > new Date()) {
        throw new Error("Date of birth cannot be in the future");
      }
    }

    // Transaction to prevent TOCTOU race condition
    return await prisma.$transaction(async (tx) => {
      const memberCount = await tx.familyMember.count({
        where: { userId },
      });

      if (user.plan === "FREE" && memberCount >= 1) {
        const error = new Error("Free plan limited to 1 family member. Upgrade to Premium.");
        (error as any).code = "PAYWALL";
        (error as any).trigger = "ADD_FAMILY_MEMBER";
        throw error;
      }

      if (user.plan !== "FREE" && user.plan !== "PREMIUM" && memberCount >= 6) {
        const error = new Error("Maximum 6 family members allowed.");
        (error as any).code = "LIMIT";
        throw error;
      }

      const member = await tx.familyMember.create({
        data: {
          userId,
          name: data.name.trim(),
          relationship: data.relationship.trim(),
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        },
      });

      await usageService.trackAction(userId, "ADD_FAMILY_MEMBER");

      return member;
    });
  }

  async updateMember(
    userId: string,
    memberId: string,
    data: Partial<{ name: string; relationship: string; dateOfBirth: string }>
  ) {
    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });
    if (!member) throw new Error("Family member not found");

    if (data.name !== undefined) {
      if (typeof data.name !== "string" || data.name.trim().length === 0) {
        throw new Error("Name cannot be empty");
      }
      if (data.name.length > 100) {
        throw new Error("Name must be 100 characters or less");
      }
    }

    if (data.dateOfBirth !== undefined) {
      if (data.dateOfBirth) {
        const dob = new Date(data.dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new Error("Invalid date of birth");
        }
        if (dob > new Date()) {
          throw new Error("Date of birth cannot be in the future");
        }
      }
    }

    return prisma.familyMember.update({
      where: { id: memberId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.relationship && { relationship: data.relationship.trim() }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
      },
    });
  }

  async deleteMember(userId: string, memberId: string) {
    return await prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.findFirst({
        where: { id: memberId, userId },
      });
      if (!member) throw new Error("Family member not found");

      await tx.familyMember.delete({ where: { id: memberId } });
      return { message: "Family member deleted" };
    });
  }
}

export const familyMemberService = new FamilyMemberService();
