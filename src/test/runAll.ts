import { spawn } from "child_process";

const BASE = "http://localhost:3001";

async function waitForServer(timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`${BASE}/health`);
      if (resp.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server did not start");
}

function runTest(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", file], {
      cwd: __dirname + "/../..",
      stdio: "inherit",
      shell: true,
      env: { ...process.env },
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", reject);
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("  CAREDESK TEST RUNNER");
  console.log("=".repeat(60));

  process.env.PORT = "3001";
  const app = (await import("../app")).default;
  const { default: prisma } = await import("../utils/prisma");
  await prisma.$connect();

  console.log("Cleaning and reseeding database...");
  await prisma.processedWebhookEvent.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.metric.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.medication.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.usageTracker.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("Database cleaned");
  const seedCode = await new Promise<number>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "src/test/seed.ts"], {
      cwd: __dirname + "/../..",
      stdio: "inherit",
      shell: true,
      env: { ...process.env },
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error("Seed timed out")); }, 60000);
    child.on("exit", (code) => { clearTimeout(timer); resolve(code ?? 1); });
    child.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
  if (seedCode !== 0) throw new Error(`Seed failed with code ${seedCode}`);
  console.log("Database reseeded\n");

  const server = app.listen(3001);
  console.log(`[SRV] CareDesk API running on port 3001`);

  let exitCode = 0;

  try {
    console.log("\nWaiting for server...");
    await waitForServer();
    console.log("Server ready\n");

    const suites = ["authTest", "edgeCaseTest", "lifecycleTest"];
    for (const suite of suites) {
      const file = `src/test/${suite}.ts`;
      console.log(`\n--- ${suite} ---`);
      const code = await runTest(file);
      if (code !== 0) {
        console.error(`--- ${suite} FAILED (code ${code}) ---`);
        exitCode = code;
        break;
      }
      console.log(`--- ${suite} PASSED ---`);
    }
  } catch (err) {
    console.error("Fatal:", err);
    exitCode = 1;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Exit code: ${exitCode}`);
  process.exit(exitCode);
}

main();
