import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test users...\n");

  // Test User 1 - PATIENT
  const patient = await prisma.user.upsert({
    where: { clerkId: "test_patient_001" },
    update: {},
    create: {
      clerkId: "test_patient_001",
      email: "patient@test.caredesk",
      name: "Test Patient",
      role: "PATIENT",
      plan: "FREE",
      onboarded: true,
    },
  });
  console.log(`Patient: ${patient.id} (${patient.clerkId})`);

  // Test User 2 - CAREGIVER
  const caregiver = await prisma.user.upsert({
    where: { clerkId: "test_caregiver_001" },
    update: {},
    create: {
      clerkId: "test_caregiver_001",
      email: "caregiver@test.caredesk",
      name: "Test Caregiver",
      role: "CAREGIVER",
      plan: "PREMIUM",
      onboarded: true,
    },
  });
  console.log(`Caregiver: ${caregiver.id} (${caregiver.clerkId})`);

  // Test User 3 - DOCTOR
  const doctor = await prisma.user.upsert({
    where: { clerkId: "test_doctor_001" },
    update: {},
    create: {
      clerkId: "test_doctor_001",
      email: "doctor@test.caredesk",
      name: "Test Doctor",
      role: "DOCTOR",
      plan: "FAMILY",
      onboarded: true,
    },
  });
  console.log(`Doctor: ${doctor.id} (${doctor.clerkId})`);

  // Create family members for patient
  const familyMember1 = await prisma.familyMember.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      userId: patient.id,
      name: "John Doe",
      relationship: "Father",
      dateOfBirth: new Date("1960-05-15"),
    },
  });
  console.log(`Family Member 1: ${familyMember1.id} (${familyMember1.name})`);

  const familyMember2 = await prisma.familyMember.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      userId: patient.id,
      name: "Jane Doe",
      relationship: "Mother",
      dateOfBirth: new Date("1962-08-20"),
    },
  });
  console.log(`Family Member 2: ${familyMember2.id} (${familyMember2.name})`);

  // Create family member for caregiver
  const familyMember3 = await prisma.familyMember.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      userId: caregiver.id,
      name: "Bob Smith",
      relationship: "Spouse",
      dateOfBirth: new Date("1985-03-10"),
    },
  });
  console.log(`Family Member 3: ${familyMember3.id} (${familyMember3.name})`);

  // Create medications for family member 1 (fixed ID for tests)
  const medication1 = await prisma.medication.upsert({
    where: { id: "85ef42c7-1013-49cd-87d9-23ffc5bba7ff" },
    update: {},
    create: {
      id: "85ef42c7-1013-49cd-87d9-23ffc5bba7ff",
      familyMemberId: familyMember1.id,
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      startDate: new Date("2025-01-01"),
      active: true,
    },
  });
  console.log(`Medication: ${medication1.id} (${medication1.name})`);

  // Create visit for family member 1 (fixed ID for tests)
  const visit1 = await prisma.visit.upsert({
    where: { id: "c93ffe4f-6363-4043-bb53-e0ac57723627" },
    update: {},
    create: {
      id: "c93ffe4f-6363-4043-bb53-e0ac57723627",
      userId: patient.id,
      familyMemberId: familyMember1.id,
      visitDate: new Date("2025-12-01"),
      doctorName: "Dr. Smith",
      specialty: "Cardiology",
      symptoms: ["chest pain", "shortness of breath"],
    },
  });
  console.log(`Visit: ${visit1.id}`);

  // Create alert for patient (fixed ID for tests)
  const alert1 = await prisma.alert.upsert({
    where: { id: "2b555b26-636f-4c08-868c-20a5d2a6ce26" },
    update: {},
    create: {
      id: "2b555b26-636f-4c08-868c-20a5d2a6ce26",
      familyMemberId: familyMember1.id,
      userId: patient.id,
      alertType: "MEDICATION",
      title: "Medication Reminder",
      message: "Time to take Metformin 500mg",
      read: false,
    },
  });
  console.log(`Alert: ${alert1.id}`);

  console.log("\n--- Test Data IDs ---");
  console.log(`Patient clerkId:     ${patient.clerkId}`);
  console.log(`Caregiver clerkId:   ${caregiver.clerkId}`);
  console.log(`Doctor clerkId:      ${doctor.clerkId}`);
  console.log(`Patient userId:      ${patient.id}`);
  console.log(`Caregiver userId:    ${caregiver.id}`);
  console.log(`Doctor userId:       ${doctor.id}`);
  console.log(`Family Member 1 ID:  ${familyMember1.id}`);
  console.log(`Family Member 2 ID:  ${familyMember2.id}`);
  console.log(`Family Member 3 ID:  ${familyMember3.id}`);
  console.log(`Medication 1 ID:     ${medication1.id}`);
  console.log(`Visit 1 ID:          ${visit1.id}`);
  console.log(`Alert 1 ID:          ${alert1.id}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
