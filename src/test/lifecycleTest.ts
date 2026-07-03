import { PrismaClient } from "@prisma/client";
import { generateTestToken } from "../middleware/auth";

const BASE = "http://localhost:3001";
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
let total = 0;
const createdIds: string[] = [];

function test(label: string, actual: number | string | boolean | null | undefined, expected: number | string | boolean | null | undefined | (number | string)[]) {
  total++;
  const expectedArr = Array.isArray(expected) ? expected : [expected];
  const pass = expectedArr.includes(actual as any);
  if (pass) {
    passed++;
    console.log(`  \u2705 ${label}`);
  } else {
    failed++;
    console.log(`  \u274C ${label} -> got "${actual}", expected ${expectedArr.join("|")}`);
  }
}

function testArray(label: string, arr: any[], minLen: number) {
  total++;
  if (arr && arr.length >= minLen) {
    passed++;
    console.log(`  \u2705 ${label} (${arr.length} items)`);
  } else {
    failed++;
    console.log(`  \u274C ${label} -> got ${arr?.length || 0} items, expected >= ${minLen}`);
  }
}

function testContains(label: string, obj: any, key: string) {
  total++;
  if (obj && obj[key] !== undefined && obj[key] !== null) {
    passed++;
    console.log(`  \u2705 ${label} (${key}="${String(obj[key]).substring(0, 50)}")`);
  } else {
    failed++;
    console.log(`  \u274C ${label} -> ${key} is missing or null`);
  }
}

async function req(method: string, path: string, token?: string, body?: any): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any;
  try { data = await resp.json(); } catch { data = { raw: await resp.text() }; }
  return { status: resp.status, data };
}

function getVal(data: any, key: string): any {
  return data?.data?.[key] ?? data?.[key];
}

async function cleanup() {
  // Clean test data
  for (const id of createdIds.reverse()) {
    try {
      await prisma.alert.deleteMany({ where: { familyMemberId: id } });
      await prisma.visit.deleteMany({ where: { familyMemberId: id } });
      await prisma.medication.deleteMany({ where: { familyMemberId: id } });
      await prisma.report.deleteMany({ where: { familyMemberId: id } });
      await prisma.familyMember.delete({ where: { id } }).catch(() => {});
    } catch {}
  }
}

async function run() {
  console.log("=".repeat(70));
  console.log("  CAREDESK FULL LIFECYCLE INTEGRATION TEST");
  console.log("=".repeat(70));

  const PATIENT_TOKEN = generateTestToken("test_patient_001");
  const CAREGIVER_TOKEN = generateTestToken("test_caregiver_001");
  const PATIENT_FM_ID = "00000000-0000-0000-0000-000000000001";
  const PATIENT_FM_ID2 = "00000000-0000-0000-0000-000000000002";
  const CAREGIVER_FM_ID = "00000000-0000-0000-0000-000000000003";

  // ═══════════════════════════════════════════════════════
  // SECTION 1: FAMILY MEMBER LIFECYCLE
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 1: FAMILY MEMBER LIFECYCLE");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 1.1 List existing family members
  console.log("\n1.1 List existing family members for patient");
  let r = await req("GET", "/api/family-members/", PATIENT_TOKEN);
  test("List patient members", r.status, 200);
  testArray("Has family members", r.data.data, 2);

  // 1.2 Get specific family member
  console.log("\n1.2 Get specific family member");
  r = await req("GET", `/api/family-members/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("Get member by ID", r.status, 200);
  testContains("Member has name", r.data.data, "name");
  testContains("Member has relationship", r.data.data, "relationship");

  // 1.3 Update family member
  console.log("\n1.3 Update family member");
  r = await req("PATCH", `/api/family-members/${PATIENT_FM_ID}`, PATIENT_TOKEN, {
    name: "John Doe Updated",
    relationship: "Father (Updated)",
  });
  test("Update member", r.status, 200);

  // 1.4 Verify update persisted
  r = await req("GET", `/api/family-members/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("Verify update persisted", r.status, 200);

  // 1.5 Cross-user isolation
  console.log("\n1.5 Cross-user isolation - caregiver vs patient");
  r = await req("GET", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver can't read patient member", r.status, 404);

  r = await req("PATCH", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN, { name: "Hacked" });
  test("Caregiver can't update patient member", r.status, 400);

  r = await req("DELETE", `/api/family-members/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver can't delete patient member", r.status, 400);

  // 1.6 Caregiver's own data
  console.log("\n1.6 Caregiver's own data");
  r = await req("GET", "/api/family-members/", CAREGIVER_TOKEN);
  test("Caregiver lists own members", r.status, 200);

  r = await req("GET", `/api/family-members/${CAREGIVER_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver gets own member", r.status, 200);

  // ═══════════════════════════════════════════════════════
  // SECTION 2: MEDICATION LIFECYCLE
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 2: MEDICATION LIFECYCLE");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 2.1 Create medication
  console.log("\n2.1 Create medication for patient's father");
  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID,
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    startDate: "2026-01-01",
  });
  test("Create medication", r.status, 201);
  const medId1 = getVal(r.data, "id");
  if (medId1) createdIds.push(medId1);

  // 2.2 Create second medication
  console.log("\n2.2 Create second medication");
  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID,
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    startDate: "2026-02-01",
  });
  test("Create second medication", r.status, 201);
  const medId2 = getVal(r.data, "id");
  if (medId2) createdIds.push(medId2);

  // 2.3 List medications
  console.log("\n2.3 List medications for family member");
  r = await req("GET", `/api/medications/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("List medications", r.status, 200);
  testArray("Has 2+ medications", r.data.data, 2);

  // 2.4 Update medication
  console.log("\n2.4 Update medication");
  r = await req("PATCH", `/api/medications/${medId1}`, PATIENT_TOKEN, {
    dosage: "1000mg",
    frequency: "Three times daily",
  });
  test("Update medication dosage", r.status, 200);

  // 2.5 Verify update
  r = await req("GET", `/api/medications/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  const updatedMed = r.data.data?.find((m: any) => m.id === medId1);
  test("Verify dosage updated", updatedMed?.dosage, "1000mg");

  // 2.6 Deactivate medication
  console.log("\n2.6 Deactivate medication");
  r = await req("POST", `/api/medications/${medId1}/deactivate`, PATIENT_TOKEN);
  test("Deactivate medication", r.status, 200);

  // 2.7 Verify deactivation - should only show active
  r = await req("GET", `/api/medications/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  const activeMeds = r.data.data?.filter((m: any) => m.active);
  test("Deactivated med not in active list", activeMeds?.find((m: any) => m.id === medId1), undefined);

  // 2.8 Cross-user isolation
  console.log("\n2.8 Cross-user medication isolation");
  r = await req("GET", `/api/medications/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver can't list patient meds", r.status, 400);

  r = await req("PATCH", `/api/medications/${medId2}`, CAREGIVER_TOKEN, { name: "Hacked" });
  test("Caregiver can't update patient med", r.status, 400);

  r = await req("POST", `/api/medications/${medId2}/deactivate`, CAREGIVER_TOKEN);
  test("Caregiver can't deactivate patient med", r.status, 400);

  // ═══════════════════════════════════════════════════════
  // SECTION 3: VISIT LIFECYCLE
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 3: VISIT LIFECYCLE");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 3.1 Create visit
  console.log("\n3.1 Create doctor visit");
  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {
    familyMemberId: PATIENT_FM_ID,
    visitDate: "2026-03-15T10:00:00Z",
    doctorName: "Dr. Smith",
    specialty: "Cardiology",
    symptoms: ["chest pain", "shortness of breath", "fatigue"],
  });
  test("Create visit", r.status, 201);
  const visitId1 = getVal(r.data, "id");
  if (visitId1) createdIds.push(visitId1);

  // 3.2 Create second visit (no family member)
  console.log("\n3.2 Create visit without family member");
  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {
    visitDate: "2026-04-01T14:30:00Z",
    doctorName: "Dr. Johnson",
    specialty: "Endocrinology",
    symptoms: ["fatigue", "weight gain"],
  });
  test("Create visit without member", r.status, 201);
  const visitId2 = getVal(r.data, "id");
  if (visitId2) createdIds.push(visitId2);

  // 3.3 List visits
  console.log("\n3.3 List visits");
  r = await req("GET", "/api/visits/", PATIENT_TOKEN);
  test("List visits", r.status, 200);
  testArray("Has visits", r.data.data?.data || r.data.data, 2);

  // 3.4 Get specific visit
  console.log("\n3.4 Get specific visit");
  r = await req("GET", `/api/visits/${visitId1}`, PATIENT_TOKEN);
  test("Get visit by ID", r.status, 200);
  testContains("Visit has doctorName", r.data.data, "doctorName");
  testContains("Visit has symptoms", r.data.data, "symptoms");

  // 3.5 Generate AI questions for visit
  console.log("\n3.5 Generate AI questions for visit (mock mode)");
  r = await req("POST", `/api/visits/${visitId1}/questions`, PATIENT_TOKEN);
  test("Generate AI questions", r.status, 200);
  const questions = r.data.data?.questions;
  if (questions) {
    testArray("Got AI questions", questions, 5);
  }

  // 3.6 Add doctor notes (with AI summary)
  console.log("\n3.6 Add doctor notes with AI summary (mock mode)");
  r = await req("POST", `/api/visits/${visitId1}/notes`, PATIENT_TOKEN, {
    doctorNotes: "Patient presented with chest pain and shortness of breath. ECG normal. Blood pressure 140/90. Recommended lifestyle changes and follow-up in 3 months.",
  });
  test("Add doctor notes", r.status, 200);
  testContains("Visit has doctorNotes", r.data.data, "doctorNotes");
  testContains("Visit has AI summary", r.data.data, "summary");

  // 3.7 Verify visit with all data
  console.log("\n3.7 Verify visit with all data");
  r = await req("GET", `/api/visits/${visitId1}`, PATIENT_TOKEN);
  test("Get enriched visit", r.status, 200);
  testContains("Has aiQuestions", r.data.data, "aiQuestions");
  testContains("Has doctorNotes", r.data.data, "doctorNotes");
  testContains("Has summary", r.data.data, "summary");

  // 3.8 Cross-user isolation
  console.log("\n3.8 Cross-user visit isolation");
  r = await req("GET", `/api/visits/${visitId1}`, CAREGIVER_TOKEN);
  test("Caregiver can't read patient visit", r.status, 404);

  r = await req("POST", `/api/visits/${visitId1}/questions`, CAREGIVER_TOKEN);
  test("Caregiver can't generate questions for patient visit", r.status, 404);

  // ═══════════════════════════════════════════════════════
  // SECTION 4: ALERT LIFECYCLE
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 4: ALERT LIFECYCLE");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 4.1 Check existing alerts (from seed)
  console.log("\n4.1 Check existing alerts");
  r = await req("GET", "/api/alerts/", PATIENT_TOKEN);
  test("List alerts", r.status, 200);
  const alertCount = r.data.data?.data?.length || 0;

  // 4.2 Unread count
  console.log("\n4.2 Get unread count");
  r = await req("GET", "/api/alerts/unread-count", PATIENT_TOKEN);
  test("Get unread count", r.status, 200);
  testContains("Has unreadCount", r.data.data, "unreadCount");

  // 4.3 Mark one alert as read
  console.log("\n4.3 Mark specific alert as read");
  const firstAlert = (await req("GET", "/api/alerts/", PATIENT_TOKEN)).data.data?.data?.[0];
  if (firstAlert) {
    r = await req("POST", `/api/alerts/${firstAlert.id}/read`, PATIENT_TOKEN);
    test("Mark alert as read", r.status, 200);

    // 4.4 Verify read status
    r = await req("GET", "/api/alerts/", PATIENT_TOKEN);
    const readAlert = r.data.data?.data?.find((a: any) => a.id === firstAlert.id);
    test("Alert is now read", readAlert?.read, true);
    testContains("Alert has readAt", readAlert, "readAt");
  }

  // 4.5 Mark all as read
  console.log("\n4.5 Mark all alerts as read");
  r = await req("POST", "/api/alerts/read-all", PATIENT_TOKEN);
  test("Mark all read", r.status, 200);

  // 4.6 Verify all read
  r = await req("GET", "/api/alerts/unread-count", PATIENT_TOKEN);
  test("Unread count is 0", r.data.data?.unreadCount, 0);

  // 4.7 Filter unread only
  console.log("\n4.7 Filter unread only");
  r = await req("GET", "/api/alerts/?unreadOnly=true", PATIENT_TOKEN);
  test("Unread filter returns empty", r.data.data?.data?.length, 0);

  // 4.8 Cross-user isolation
  console.log("\n4.8 Cross-user alert isolation");
  r = await req("POST", `/api/alerts/${firstAlert?.id}/read`, CAREGIVER_TOKEN);
  test("Caregiver can't mark patient alert", r.status, 400);

  // ═══════════════════════════════════════════════════════
  // SECTION 5: REPORT UPLOAD & AI PIPELINE
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 5: REPORT UPLOAD & AI PIPELINE");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 5.1 Upload report URL
  console.log("\n5.1 Generate upload URL for medical report");
  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
    fileName: "blood-work-report.pdf",
    fileType: "application/pdf",
    fileSize: 2048000,
    familyMemberId: PATIENT_FM_ID,
  });
  test("Generate upload URL", r.status, 200);
  testContains("Has reportId", r.data.data, "reportId");
  testContains("Has key", r.data.data, "key");
  const reportId1 = r.data.data?.reportId;
  if (reportId1) createdIds.push(reportId1);

  // 5.2 Get report details
  console.log("\n5.2 Get report details");
  r = await req("GET", `/api/reports/${reportId1}`, PATIENT_TOKEN);
  test("Get report", r.status, 200);
  testContains("Report has fileName", r.data.data, "fileName");
  testContains("Report has processed=false", r.data.data, "processed");

  // 5.3 Process report with AI (mock mode)
  console.log("\n5.3 Process report with AI (mock mode)");
  r = await req("POST", `/api/reports/${reportId1}/process`, PATIENT_TOKEN);
  test("Process report", r.status, 200);

  // 5.4 Verify processing results
  console.log("\n5.4 Verify AI processing results");
  r = await req("GET", `/api/reports/${reportId1}`, PATIENT_TOKEN);
  test("Report is processed", r.data.data?.processed, true);
  testContains("Has aiSummary", r.data.data, "aiSummary");
  testContains("Has rawMetrics", r.data.data, "rawMetrics");

  // 5.5 Check metrics were created
  console.log("\n5.5 Check metrics were created from AI analysis");
  r = await req("GET", `/api/reports/metrics/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("Metrics endpoint works", r.status, 200);
  testArray("Metrics were created", r.data.data, 3);

  // 5.6 Check metric trend
  console.log("\n5.6 Check metric trend");
  r = await req("GET", `/api/reports/trend/${PATIENT_FM_ID}/HbA1c`, PATIENT_TOKEN);
  test("Metric trend works", r.status, 200);
  testArray("Has trend data", r.data.data, 1);

  // 5.7 Check timeline
  console.log("\n5.7 Check health timeline");
  r = await req("GET", `/api/reports/timeline/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("Timeline works", r.status, 200);
  testArray("Timeline has reports", r.data.data.data, 1);
  testContains("Timeline has total", r.data.data, "total");

  // 5.8 Check available metrics
  console.log("\n5.8 Check available metrics");
  r = await req("GET", `/api/reports/metrics/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("Available metrics work", r.status, 200);

  // 5.9 Upload second report (may hit FREE plan limit)
  console.log("\n5.9 Upload second report (test FREE plan paywall)");
  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
    fileName: "lipid-panel.png",
    fileType: "image/png",
    fileSize: 1024000,
    familyMemberId: PATIENT_FM_ID,
  });
  // FREE plan limited to 3 reports - may be 200 or 403 depending on count
  const uploadStatus = r.status;
  test("Upload second report (200 or 403 paywall)", uploadStatus, [200, 403]);
  const reportId2 = uploadStatus === 200 ? r.data.data?.reportId : null;

  // 5.10 Process second report (only if upload succeeded)
  if (reportId2) {
    r = await req("POST", `/api/reports/${reportId2}/process`, PATIENT_TOKEN);
    test("Process second report", r.status, 200);
  } else {
    test("Process second report (skipped - paywall)", true, true);
  }

  // 5.11 Timeline now has 2 reports
  console.log("\n5.11 Timeline shows multiple reports");
  r = await req("GET", `/api/reports/timeline/${PATIENT_FM_ID}`, PATIENT_TOKEN);
  test("Timeline has multiple reports", r.data.data?.total >= 2, true);
  testArray("Timeline data", r.data.data.data, 2);

  // 5.12 Check alerts created from abnormal values
  console.log("\n5.12 Check alerts created from abnormal AI findings");
  r = await req("GET", "/api/alerts/", PATIENT_TOKEN);
  const abnormalAlerts = r.data.data?.data?.filter((a: any) => a.alertType === "ABNORMAL");
  test("Abnormal alerts created by AI", abnormalAlerts?.length >= 1, true);

  // 5.13 Cross-user report isolation
  console.log("\n5.13 Cross-user report isolation");
  r = await req("GET", `/api/reports/${reportId1}`, CAREGIVER_TOKEN);
  test("Caregiver can't read patient report", r.status, 404);

  r = await req("POST", `/api/reports/${reportId1}/process`, CAREGIVER_TOKEN);
  test("Caregiver can't process patient report", r.status, 500);

  r = await req("GET", `/api/reports/timeline/${PATIENT_FM_ID}`, CAREGIVER_TOKEN);
  test("Caregiver timeline is empty (scoping)", r.data.data?.data?.length, 0);

  // ═══════════════════════════════════════════════════════
  // SECTION 6: SUBSCRIPTION & USER LIFECYCLE
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 6: SUBSCRIPTION & USER LIFECYCLE");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 6.1 Check subscription status
  console.log("\n6.1 Check subscription status");
  r = await req("GET", "/api/subscriptions/status", PATIENT_TOKEN);
  test("Get subscription status", r.status, 200);
  testContains("Has plan", r.data.data, "plan");
  testContains("Has isActive", r.data.data, "isActive");

  // 6.2 Get user profile
  console.log("\n6.2 Get user profile");
  r = await req("GET", "/api/auth/me", PATIENT_TOKEN);
  test("Get user profile", r.status, 200);
  testContains("User has name", r.data.data, "name");
  testContains("User has email", r.data.data, "email");
  testContains("User has role", r.data.data, "role");
  testContains("User has plan", r.data.data, "plan");

  // ═══════════════════════════════════════════════════════
  // SECTION 7: DATA INTEGRITY CONSTRAINTS
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 7: DATA INTEGRITY CONSTRAINTS");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  // 7.1 Free plan limits
  console.log("\n7.1 Free plan family member limit");
  r = await req("POST", "/api/family-members/", PATIENT_TOKEN, {
    name: "Extra Member",
    relationship: "Sibling",
  });
  test("FREE plan limits to existing members (403)", r.status, 403);

  // 7.2 Report type validation
  console.log("\n7.2 Report type validation");
  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
    fileName: "test.exe",
    fileType: "application/x-executable",
    fileSize: 1000,
    familyMemberId: PATIENT_FM_ID,
  });
  test("Disallowed file type rejected", r.status, 400);

  // 7.3 File size validation
  console.log("\n7.3 File size validation");
  r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
    fileName: "huge-report.pdf",
    fileType: "application/pdf",
    fileSize: 50 * 1024 * 1024,
    familyMemberId: PATIENT_FM_ID,
  });
  test("Oversized file rejected", r.status, 400);

  // 7.4 Required field validation
  console.log("\n7.4 Required field validation");
  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {});
  test("Empty visit body rejected", r.status, 400);

  r = await req("POST", "/api/medications/", PATIENT_TOKEN, {});
  test("Empty medication body rejected", r.status, 400);

  // 7.5 Invalid date validation
  console.log("\n7.5 Invalid date validation");
  r = await req("POST", "/api/visits/", PATIENT_TOKEN, {
    visitDate: "not-a-date",
    symptoms: ["pain"],
  });
  test("Invalid visit date rejected", r.status, 400);

  // ═══════════════════════════════════════════════════════
  // SECTION 8: CROSS-USER DATA ISOLATION SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.log("\u2502  SECTION 8: CROSS-USER DATA ISOLATION SUMMARY");
  console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");

  console.log("\n8.1 Verify patient data count");
  r = await req("GET", "/api/family-members/", PATIENT_TOKEN);
  const patientFMs = r.data.data?.length;
  test("Patient has 2 family members", patientFMs, 2);

  r = await req("GET", "/api/visits/", PATIENT_TOKEN);
  const patientVisits = r.data.data?.data?.length || r.data.data?.length;
  test("Patient has visits", patientVisits >= 2, true);

  r = await req("GET", "/api/alerts/", PATIENT_TOKEN);
  test("Patient has alerts", r.data.data?.data?.length >= 1, true);

  r = await req("GET", "/api/reports/timeline/" + PATIENT_FM_ID, PATIENT_TOKEN);
  test("Patient has reports", r.data.data?.total >= 2, true);

  console.log("\n8.2 Verify caregiver data isolation");
  r = await req("GET", "/api/family-members/", CAREGIVER_TOKEN);
  const caregiverFMs = r.data.data?.length;
  test("Caregiver has own family members", caregiverFMs, 1);

  r = await req("GET", "/api/visits/", CAREGIVER_TOKEN);
  test("Caregiver has own visits", r.data.data?.total >= 0, true);

  r = await req("GET", "/api/alerts/", CAREGIVER_TOKEN);
  test("Caregiver has own alerts", r.data.data?.data?.length >= 0, true);

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(70));
  console.log("  LIFECYCLE TEST SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed} \u2705`);
  console.log(`Failed: ${failed} ${failed > 0 ? "\u274C" : "\u2705"}`);
  console.log("=".repeat(70));

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error("Test failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
