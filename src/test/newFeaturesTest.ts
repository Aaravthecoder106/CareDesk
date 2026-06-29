import { generateTestToken } from "../middleware/auth";

const BASE = "http://localhost:3002";
const PATIENT_TOKEN = generateTestToken("test_patient_001");

async function req(method: string, path: string, token?: string, body?: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  let passed = 0;
  let failed = 0;

  function check(label: string, ok: boolean) {
    if (ok) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
  }

  console.log("=== NEW FEATURE TESTS ===\n");

  // 1. Categories CRUD
  console.log("--- CATEGORIES ---");

  let r = await req("GET", "/api/categories", PATIENT_TOKEN);
  check("GET /api/categories -> 200", r.status === 200);

  r = await req("POST", "/api/categories", PATIENT_TOKEN, { name: "Blood Tests", color: "#FF0000" });
  check("POST /api/categories -> 201 (create Blood Tests)", r.status === 201);
  const cat1Id = r.data?.data?.id;

  r = await req("POST", "/api/categories", PATIENT_TOKEN, { name: "Heart", color: "#00FF00" });
  check("POST /api/categories -> 201 (create Heart)", r.status === 201);
  const cat2Id = r.data?.data?.id;

  r = await req("POST", "/api/categories", PATIENT_TOKEN, { name: "" });
  check("POST /api/categories -> 400 (empty name)", r.status === 400);

  r = await req("GET", "/api/categories", PATIENT_TOKEN);
  check("GET /api/categories -> has 2 categories", r.status === 200 && r.data?.data?.length >= 2);

  r = await req("PATCH", `/api/categories/${cat1Id}`, PATIENT_TOKEN, { name: "Blood Work" });
  check("PATCH /api/categories/:id -> 200 (rename)", r.status === 200);

  // 2. Reports list + journey
  console.log("\n--- REPORTS LIST + JOURNEY ---");

  r = await req("GET", "/api/reports/", PATIENT_TOKEN);
  check("GET /api/reports/ -> 200", r.status === 200);

  r = await req("GET", "/api/reports/journey", PATIENT_TOKEN);
  check("GET /api/reports/journey -> 200", r.status === 200);
  check("Journey has totalReports", typeof r.data?.data?.totalReports === "number");
  check("Journey has timeline array", Array.isArray(r.data?.data?.timeline));

  // 3. Upload report + assign category
  console.log("\n--- REPORT UPLOAD + CATEGORY ASSIGN ---");

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
    fileName: "blood-test.pdf",
    fileType: "application/pdf",
    fileSize: 1024000,
  });
  check("POST /api/reports/upload-url -> 200", r.status === 200);
  const reportId = r.data?.data?.reportId;

  if (reportId) {
    r = await req("POST", `/api/reports/${reportId}/category`, PATIENT_TOKEN, { categoryId: cat1Id });
    check("POST /api/reports/:id/category -> 200 (assign)", r.status === 200);

    r = await req("POST", `/api/reports/${reportId}/category`, PATIENT_TOKEN, { categoryId: null });
    check("POST /api/reports/:id/category -> 200 (unassign)", r.status === 200);
  }

  // 4. Chat
  console.log("\n--- CHAT ---");

  r = await req("GET", "/api/chat/history", PATIENT_TOKEN);
  check("GET /api/chat/history -> 200", r.status === 200);
  check("History is array", Array.isArray(r.data?.data));

  r = await req("POST", "/api/chat/send", PATIENT_TOKEN, { message: "Hello, what are my latest reports?" });
  check("POST /api/chat/send -> 200", r.status === 200);
  check("Reply is string", typeof r.data?.data?.reply === "string" && r.data.data.reply.length > 0);

  r = await req("POST", "/api/chat/send", PATIENT_TOKEN, { message: "" });
  check("POST /api/chat/send -> 400 (empty)", r.status === 400);

  r = await req("GET", "/api/chat/history", PATIENT_TOKEN);
  check("History after chat -> has messages", r.status === 200 && r.data?.data?.length >= 2);

  r = await req("DELETE", "/api/chat/history", PATIENT_TOKEN);
  check("DELETE /api/chat/history -> 200", r.status === 200);

  r = await req("GET", "/api/chat/history", PATIENT_TOKEN);
  check("History after clear -> empty", r.status === 200 && r.data?.data?.length === 0);

  // 5. Cleanup - delete categories
  console.log("\n--- CLEANUP ---");

  if (cat1Id) {
    r = await req("DELETE", `/api/categories/${cat1Id}`, PATIENT_TOKEN);
    check("DELETE /api/categories/:id -> 200", r.status === 200);
  }
  if (cat2Id) {
    r = await req("DELETE", `/api/categories/${cat2Id}`, PATIENT_TOKEN);
    check("DELETE /api/categories/:id -> 200", r.status === 200);
  }

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
