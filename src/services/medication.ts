import prisma from "../utils/prisma";

export class MedicationService {
  async addMedication(
    userId: string,
    data: {
      familyMemberId: string;
      name: string;
      dosage: string;
      frequency: string;
      startDate: string;
      notes?: string;
    }
  ) {
    if (!data.familyMemberId) throw new Error("familyMemberId is required");
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      throw new Error("Medication name is required");
    }
    if (data.name.length > 200) throw new Error("Medication name must be 200 characters or less");
    if (!data.dosage || typeof data.dosage !== "string") throw new Error("Dosage is required");
    if (!data.frequency || typeof data.frequency !== "string") throw new Error("Frequency is required");
    if (!data.startDate) throw new Error("Start date is required");

    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) throw new Error("Invalid start date");
    if (startDate > new Date()) throw new Error("Start date cannot be in the future");

    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== "string") throw new Error("Notes must be a string");
      if (data.notes.length > 5000) throw new Error("Notes must be 5000 characters or less");
    }

    const member = await prisma.familyMember.findFirst({
      where: { id: data.familyMemberId, userId },
    });
    if (!member) throw new Error("Family member not found");

    return prisma.medication.create({
      data: {
        familyMemberId: data.familyMemberId,
        name: data.name.trim(),
        dosage: data.dosage.trim(),
        frequency: data.frequency.trim(),
        startDate,
        notes: data.notes,
      },
    });
  }

  async getMedications(userId: string, familyMemberId: string) {
    const member = await prisma.familyMember.findFirst({
      where: { id: familyMemberId, userId },
    });
    if (!member) throw new Error("Family member not found");

    return prisma.medication.findMany({
      where: { familyMemberId, active: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateMedication(
    userId: string,
    medId: string,
    data: Partial<{
      name: string;
      dosage: string;
      frequency: string;
      active: boolean;
      notes: string;
    }>
  ) {
    const medication = await prisma.medication.findFirst({
      where: { id: medId, familyMember: { userId } },
    });
    if (!medication) throw new Error("Medication not found");

    const safeUpdate: Record<string, any> = {};
    if (data.name !== undefined) {
      if (typeof data.name !== "string" || data.name.trim().length === 0) throw new Error("Name cannot be empty");
      if (data.name.length > 200) throw new Error("Name must be 200 characters or less");
      safeUpdate.name = data.name.trim();
    }
    if (data.dosage !== undefined) {
      if (typeof data.dosage !== "string" || data.dosage.trim().length === 0) throw new Error("Dosage cannot be empty");
      safeUpdate.dosage = data.dosage.trim();
    }
    if (data.frequency !== undefined) {
      if (typeof data.frequency !== "string" || data.frequency.trim().length === 0) throw new Error("Frequency cannot be empty");
      safeUpdate.frequency = data.frequency.trim();
    }
    if (data.active !== undefined) safeUpdate.active = data.active;
    if (data.notes !== undefined) {
      if (typeof data.notes !== "string") throw new Error("Notes must be a string");
      if (data.notes.length > 5000) throw new Error("Notes must be 5000 characters or less");
      safeUpdate.notes = data.notes;
    }

    return prisma.medication.update({
      where: { id: medId },
      data: safeUpdate,
    });
  }

  async deactivateMedication(userId: string, medId: string) {
    const medication = await prisma.medication.findFirst({
      where: { id: medId, familyMember: { userId } },
    });
    if (!medication) throw new Error("Medication not found");

    return prisma.medication.update({
      where: { id: medId },
      data: { active: false, endDate: new Date() },
    });
  }
}

export const medicationService = new MedicationService();
