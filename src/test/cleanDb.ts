import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  await p.processedWebhookEvent.deleteMany({});
  await p.alert.deleteMany({});
  await p.metric.deleteMany({});
  await p.report.deleteMany({});
  await p.medication.deleteMany({});
  await p.visit.deleteMany({});
  await p.familyMember.deleteMany({});
  await p.usageTracker.deleteMany({});
  await p.user.deleteMany({});
  console.log("Database cleaned");
  await p.$disconnect();
})();
