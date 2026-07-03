import prisma from "../utils/prisma";

export async function sendMedicationReminders(): Promise<number> {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 8 || hour > 22) return 0;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const medications = await prisma.medication.findMany({
    where: { active: true },
    include: {
      familyMember: {
        include: { user: true },
      },
    },
  });

  const { alertService } = await import("../services/alert");
  let sentCount = 0;

  for (const med of medications) {
    const existingAlert = await prisma.alert.findFirst({
      where: {
        familyMemberId: med.familyMemberId,
        alertType: "MEDICATION",
        message: { contains: med.name },
        createdAt: { gte: todayStart },
      },
    });

    if (existingAlert) continue;

    await alertService.createAlert(
      med.familyMemberId,
      med.familyMember.userId,
      "MEDICATION",
      "Medication Reminder",
      `Time to take ${med.name} (${med.dosage})`
    );
    sentCount++;
  }

  return sentCount;
}
