import { generateTestToken } from "../middleware/auth";

const BASE = "http://localhost:3001";
const PATIENT_TOKEN = generateTestToken("test_patient_001");
const CAREGIVER_TOKEN = generateTestToken("test_caregiver_001");
const PATIENT_FM_ID = "00000000-0000-0000-0000-000000000001";
const CAREGIVER_FM_ID = "00000000-0000-0000-0000-000000000003";

let passed = 0;
let failed = 0;
let total = 0;

async function req(method: string, path: string, token?: string, body?: any, rawBody?: Buffer): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (rawBody) {
    headers["Content-Type"] = "application/json";
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: rawBody ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try { data = await resp.json(); } catch { data = { raw: await resp.text() }; }
  return { status: resp.status, data };
}

function test(label: string, actual: number, expected: number | number[], data?: any) {
  total++;
  const expectedArr = Array.isArray(expected) ? expected : [expected];
  const pass = expectedArr.includes(actual);
  if (pass) {
    passed++;
    console.log(`  \u2705 ${label} -> ${actual}`);
  } else {
    failed++;
    console.log(`  \u274C ${label} -> ${actual} (expected ${expectedArr.join("|")})`);
    if (data) console.log(`       ${JSON.stringify(data).substring(0, 200)}`);
  }
}

async function run() {
  console.log("=".repeat(70));
  console.log("  EDGE CASE & ERROR HANDLING TEST SUITE");
  console.log("=".repeat(70));

  // ═══════════════════════════════════════════════════════
  // 1. AUTH EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 1. AUTH EDGE CASES ---");

  let r = await req("GET", "/api/auth/me");
  test("No token -> 401", r.status, 401, r.data);

  r = await req("GET", "/api/auth/me", "");
  test("Empty token -> 401", r.status, 401, r.data);

  r = await req("GET", "/api/auth/me", "not.a.jwt");
  test("Garbage token -> 401", r.status, 401, r.data);

  r = await req("GET", "/api/auth/me", "Bearer ".padEnd(200, "x"));
  test("Very long token -> 401", r.status, 401, r.data);

  r = await req("GET", "/api/auth/me", PATIENT_TOKEN);
  test("Valid patient token -> 200", r.status, 200, r.data);

  // ═══════════════════════════════════════════════════════
  // 2. WEBHOOK EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 2. WEBHOOK EDGE CASES ---");

  r = await req("POST", "/api/auth/webhook");
  test("Webhook no secret -> 401", r.status, 401, r.data);

  r = await req("POST", "/api/auth/webhook", undefined, {});
  test("Webhook empty body with no secret -> 401", r.status, 401, r.data);

  r = await req("POST", "/api/auth/webhook", undefined, { clerkId: "x", email: "x", name: "x" });
  test("Webhook body but no secret -> 401", r.status, 401, r.data);

  r = await req("POST", "/api/auth/webhook");
  test("Webhook no secret header -> 401", r.status, 401, r.data);

  // ═══════════════════════════════════════════════════════
  // 3. FAMILY MEMBER EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 3. FAMILY MEMBER EDGE CASES ---");

  r = await req("GET", "/api/family-members/", CAREGIVER_TOKEN);
  test("Caregiver list own members -> 200", r.status, 200, r.data);

  r = await req("GET", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver get patient member -> 404 (not found)", r.status, 404, r.data);

  r = await req("DELETE", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver delete patient member -> 400 (not found)", r.status, 400, r.data);

  r = await req("PATCH", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN, { name: "Hacked" });
  test("Caregiver update patient member -> 400 (not found)", r.status, 400, r.data);

  r = await req("GET", "/api/family-members/invalid-uuid", PATIENT_TOKEN);
  test("Invalid UUID param -> 404 or 400", r.status, [400, 404], r.data);

  r = await req("GET", "/api/family-members/00000000-0000-0000-0000-ffffffffffff", PATIENT_TOKEN);
  test("Non-existent UUID -> 404", r.status, 404, r.data);

  r = await req("POST", "/api/family-members/", PATIENT_TOKEN, {});
  test("Create with empty body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/family-members/", PATIENT_TOKEN, { name: "", relationship: "" });
  test("Create with empty strings -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/family-members/", PATIENT_TOKEN, { name: "X".repeat(200), relationship: "Test" });
  test("Create with very long name -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/family-members/", PATIENT_TOKEN, { name: "Test", relationship: "Son", dateOfBirth: "not-a-date" });
  test("Create with invalid date -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/family-members/", PATIENT_TOKEN, { name: "Test", relationship: "Son", dateOfBirth: "2030-01-01" });
  test("Create with future date -> 400", r.status, 400, r.data);

  r = await req("PATCH", `/api/family-members/${PATIENT_FM_ID}`, PATIENT_TOKEN, { name: "" });
  test("Update with empty name -> 400", r.status, 400, r.data);

  r = await req("PATCH", `/api/family-members/${PATIENT_FM_ID}`, PATIENT_TOKEN, { dateOfBirth: "invalid" });
  test("Update with invalid date -> 400", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // 4. REPORT EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 4. REPORT EDGE CASES ---");

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN);
  test("Upload with no body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf" });
  test("Upload missing fileType -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf", fileType: "application/pdf" });
  test("Upload missing fileSize -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf", fileType: "application/pdf", fileSize: -1 });
  test("Upload negative fileSize -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf", fileType: "application/pdf", fileSize: 0 });
  test("Upload zero fileSize -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf", fileType: "application/pdf", fileSize: "abc" });
  test("Upload string fileSize -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf", fileType: "text/html", fileSize: 1000 });
  test("Upload disallowed fileType -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, { fileName: "test.pdf", fileType: "application/pdf", fileSize: 20 * 1024 * 1024 });
  test("Upload too large file -> 400", r.status, 400, r.data);

  r = await req("GET", "/api/reports/00000000-0000-0000-0000-999999999999", PATIENT_TOKEN);
  test("Get non-existent report -> 404", r.status, 404, r.data);

  r = await req("GET", "/api/reports/00000000-0000-0000-0000-999999999999", CAREGIVER_TOKEN);
  test("Get patient report as caregiver -> 404 (IDOR prevented)", r.status, 404, r.data);

  r = await req("POST", "/api/reports/00000000-0000-0000-0000-999999999999/process", PATIENT_TOKEN);
  test("Process non-existent report -> 500 (not found)", r.status, 500, r.data);

  // ═══════════════════════════════════════════════════════
  // 5. VISIT EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 5. VISIT EDGE CASES ---");

  r = await req("POST", "/api/visits/", PATIENT_TOKEN);
  test("Create visit with no body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {});
  test("Create visit empty body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, { visitDate: "not-a-date", symptoms: ["pain"] });
  test("Create visit invalid date -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, { visitDate: "2026-01-01" });
  test("Create visit missing symptoms -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, { visitDate: "2026-01-01", symptoms: [] });
  test("Create visit empty symptoms array -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, { visitDate: "2026-01-01", symptoms: "not-array" });
  test("Create visit symptoms not array -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {
    visitDate: "2026-01-01", symptoms: ["pain"],
    familyMemberId: "00000000-0000-0000-0000-999999999999"
  });
  test("Create visit with non-existent family member -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {
    visitDate: "2026-01-01", symptoms: ["pain"],
    familyMemberId: CAREGIVER_FM_ID
  });
  test("Create visit with patient token + caregiver member -> 400 (cross-user)", r.status, 400, r.data);

  r = await req("GET", "/api/visits/00000000-0000-0000-0000-999999999999", PATIENT_TOKEN);
  test("Get non-existent visit -> 404", r.status, 404, r.data);

  r = await req("POST", "/api/visits/00000000-0000-0000-0000-999999999999/questions", PATIENT_TOKEN);
  test("Questions for non-existent visit -> 404 (not found)", r.status, 404, r.data);

  r = await req("POST", "/api/visits/00000000-0000-0000-0000-999999999999/notes", PATIENT_TOKEN);
  test("Notes for non-existent visit (no body) -> 400 (validation first)", r.status, 400, r.data);

  r = await req("POST", "/api/visits/00000000-0000-0000-0000-999999999999/notes", PATIENT_TOKEN, {});
  test("Notes empty body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/00000000-0000-0000-0000-999999999999/notes", PATIENT_TOKEN, { doctorNotes: "" });
  test("Notes empty string -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/visits/00000000-0000-0000-0000-999999999999/notes", PATIENT_TOKEN, { doctorNotes: "X".repeat(60000) });
  test("Notes too long -> 400 (validation first)", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // 6. MEDICATION EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 6. MEDICATION EDGE CASES ---");

  r = await req("POST", "/api/medications/", PATIENT_TOKEN);
  test("Create medication no body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {});
  test("Create medication empty body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID, name: "", dosage: "10mg", frequency: "daily", startDate: "2026-01-01"
  });
  test("Create medication empty name -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID, name: "Test", dosage: "", frequency: "daily", startDate: "2026-01-01"
  });
  test("Create medication empty dosage -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID, name: "Test", dosage: "10mg", frequency: "", startDate: "2026-01-01"
  });
  test("Create medication empty frequency -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID, name: "Test", dosage: "10mg", frequency: "daily", startDate: "invalid"
  });
  test("Create medication invalid date -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: "00000000-0000-0000-0000-999999999999", name: "Test", dosage: "10mg", frequency: "daily", startDate: "2026-01-01"
  });
  test("Create medication non-existent member -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: CAREGIVER_FM_ID, name: "Test", dosage: "10mg", frequency: "daily", startDate: "2026-01-01"
  });
  test("Create medication cross-user member -> 400", r.status, 400, r.data);

  r = await req("GET", "/api/medications/00000000-0000-0000-0000-999999999999", PATIENT_TOKEN);
  test("Get meds for non-existent member -> 400", r.status, 400, r.data);

  r = await req("GET", `/api/medications/${CAREGIVER_FM_ID}`, PATIENT_TOKEN);
  test("Get meds for cross-user member -> 400", r.status, 400, r.data);

  r = await req("PATCH", "/api/medications/00000000-0000-0000-0000-999999999999", PATIENT_TOKEN, { name: "X" });
  test("Update non-existent medication -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/medications/00000000-0000-0000-0000-999999999999/deactivate", PATIENT_TOKEN);
  test("Deactivate non-existent medication -> 400", r.status, 400, r.data);

  r = await req("PATCH", `/api/medications/85ef42c7-1013-49cd-87d9-23ffc5bba7ff`, CAREGIVER_TOKEN, { name: "Hacked" });
  test("Update patient medication as caregiver -> 400 (IDOR)", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // 7. ALERT EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 7. ALERT EDGE CASES ---");

  r = await req("GET", "/api/alerts/", PATIENT_TOKEN);
  test("Patient list alerts -> 200", r.status, 200, r.data);

  r = await req("GET", "/api/alerts/unread-count", PATIENT_TOKEN);
  test("Patient unread count -> 200", r.status, 200, r.data);

  r = await req("POST", "/api/alerts/read-all", PATIENT_TOKEN);
  test("Patient mark all read -> 200", r.status, 200, r.data);

  r = await req("POST", "/api/alerts/00000000-0000-0000-0000-999999999999/read", PATIENT_TOKEN);
  test("Mark non-existent alert read -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/alerts/2b555b26-636f-4c08-868c-20a5d2a6ce26/read", CAREGIVER_TOKEN);
  test("Mark patient alert as caregiver -> 400 (IDOR)", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // 8. SUBSCRIPTION EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 8. SUBSCRIPTION EDGE CASES ---");

  r = await req("GET", "/api/subscriptions/status", PATIENT_TOKEN);
  test("Patient subscription status -> 200", r.status, 200, r.data);

  r = await req("POST", "/api/subscriptions/razorpay/verify", PATIENT_TOKEN, {});
  test("Razorpay verify empty body -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/subscriptions/razorpay/verify", PATIENT_TOKEN, {
    orderId: "", paymentId: "", signature: ""
  });
  test("Razorpay verify empty strings -> 400", r.status, 400, r.data);

  r = await req("POST", "/api/subscriptions/razorpay/verify", PATIENT_TOKEN, {
    orderId: "order_123", paymentId: "pay_123", signature: "short"
  });
  test("Razorpay verify bad signature -> 400", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // 9. 404 HANDLING
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 9. 404 & UNKNOWN ROUTES ---");

  r = await req("GET", "/api/nonexistent");
  test("GET unknown route -> 404", r.status, 404, r.data);

  r = await req("POST", "/api/does-not-exist");
  test("POST unknown route -> 404", r.status, 404, r.data);

  r = await req("DELETE", "/api/fake");
  test("DELETE unknown route -> 404", r.status, 404, r.data);

  r = await req("PUT", "/api/also-fake");
  test("PUT unknown route -> 404", r.status, 404, r.data);

  // ═══════════════════════════════════════════════════════
  // 10. MALFORMED REQUEST BODY
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 10. MALFORMED REQUEST BODY ---");

  const badJson = Buffer.from("{invalid json");
  r = await req("POST", "/api/visits/", PATIENT_TOKEN, undefined, badJson);
  test("Malformed JSON body -> 400", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // 11. IDOR TESTS (cross-user access)
  // ═══════════════════════════════════════════════════════
  console.log("\n--- 11. IDOR PREVENTION ---");

  r = await req("GET", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver read patient family member -> 404", r.status, 404, r.data);

  r = await req("PATCH", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN, { name: "Hacked" });
  test("Caregiver update patient family member -> 400", r.status, 400, r.data);

  r = await req("DELETE", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver delete patient family member -> 400", r.status, 400, r.data);

  r = await req("GET", `/api/reports/timeline/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  const idorStatus = r.status;
  test("Caregiver read patient reports timeline -> 200 (empty, scoping)", r.status, 200, r.data);

  r = await req("POST", "/api/reports/upload-url", CAREGIVER_TOKEN, {
    fileName: "hack.pdf", fileType: "application/pdf", fileSize: 1000,
    familyMemberId: PATIENT_FM_ID
  });
  test("Caregiver upload to patient member -> 400 (cross-user)", r.status, 400, r.data);

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(70));
  console.log("  EDGE CASE TEST SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed} \u2705`);
  console.log(`Failed: ${failed} ${failed > 0 ? "\u274C" : "\u2705"}`);
  console.log("=".repeat(70));
}

run().catch(console.error);
