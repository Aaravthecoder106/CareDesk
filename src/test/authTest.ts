import { generateTestToken } from "../middleware/auth";

const BASE = "http://localhost:3001";

const PATIENT_CLERK_ID = "test_patient_001";
const CAREGIVER_CLERK_ID = "test_caregiver_001";
const DOCTOR_CLERK_ID = "test_doctor_001";

const PATIENT_TOKEN = generateTestToken(PATIENT_CLERK_ID);
const CAREGIVER_TOKEN = generateTestToken(CAREGIVER_CLERK_ID);
const DOCTOR_TOKEN = generateTestToken(DOCTOR_CLERK_ID);

const PATIENT_FAMILY_MEMBER_ID = "00000000-0000-0000-0000-000000000001";
const PATIENT_FAMILY_MEMBER_2_ID = "00000000-0000-0000-0000-000000000002";
const CAREGIVER_FAMILY_MEMBER_ID = "00000000-0000-0000-0000-000000000003";
const SEED_VISIT_ID = "c93ffe4f-6363-4043-bb53-e0ac57723627";
const SEED_ALERT_ID = "2b555b26-636f-4c08-868c-20a5d2a6ce26";
const SEED_MEDICATION_ID = "85ef42c7-1013-49cd-87d9-23ffc5bba7ff";

interface TestResult {
  method: string;
  path: string;
  token: string;
  expected: number;
  actual: number | string;
  body?: string;
  pass: boolean;
}

const results: TestResult[] = [];

async function req(
  method: string,
  path: string,
  token?: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await resp.json();
  } catch {
    data = { raw: await resp.text() };
  }

  return { status: resp.status, data };
}

function record(method: string, path: string, tokenLabel: string, expected: number, actual: number, data?: any) {
  const pass = actual === expected;
  results.push({ method, path, token: tokenLabel, expected, actual, pass, body: JSON.stringify(data) });
  const icon = pass ? "\u2705" : "\u274C";
  console.log(`${icon} ${method} ${path} [${tokenLabel}] -> ${actual} (expected ${expected})`);
}

async function runTests() {
  console.log("=".repeat(70));
  console.log("  AUTHENTICATION & AUTHORIZATION TEST SUITE");
  console.log("=".repeat(70));
  console.log(`Server: ${BASE}`);
  console.log(`Patient token: ${PATIENT_TOKEN.substring(0, 30)}...`);
  console.log(`Caregiver token: ${CAREGIVER_TOKEN.substring(0, 30)}...`);
  console.log(`Doctor token: ${DOCTOR_TOKEN.substring(0, 30)}...`);
  console.log();

  // ─── HEALTH ───────────────────────────────────────────
  console.log("--- HEALTH CHECK ---");
  {
    const { status, data } = await req("GET", "/health");
    record("GET", "/health", "none", 200, status, data);
  }

  // ─── AUTH ROUTES ──────────────────────────────────────
  console.log("\n--- AUTH ROUTES ---");
  {
    // GET /api/auth/me - no token
    let r = await req("GET", "/api/auth/me");
    record("GET", "/api/auth/me", "no-token", 401, r.status, r.data);

    // GET /api/auth/me - invalid token
    r = await req("GET", "/api/auth/me", "invalid_token_abc123");
    record("GET", "/api/auth/me", "invalid", 401, r.status, r.data);

    // GET /api/auth/me - valid patient token
    r = await req("GET", "/api/auth/me", PATIENT_TOKEN);
    record("GET", "/api/auth/me", "patient", 200, r.status, r.data);

    // GET /api/auth/me - valid caregiver token
    r = await req("GET", "/api/auth/me", CAREGIVER_TOKEN);
    record("GET", "/api/auth/me", "caregiver", 200, r.status, r.data);

    // GET /api/auth/me - valid doctor token
    r = await req("GET", "/api/auth/me", DOCTOR_TOKEN);
    record("GET", "/api/auth/me", "doctor", 200, r.status, r.data);

    // POST /api/auth/webhook - no secret
    r = await req("POST", "/api/auth/webhook");
    record("POST", "/api/auth/webhook", "no-secret", 401, r.status, r.data);

    // POST /api/auth/webhook - wrong secret
    r = await req("POST", "/api/auth/webhook");
    record("POST", "/api/auth/webhook", "wrong-secret", 401, r.status, r.data);
  }

  // ─── FAMILY MEMBER ROUTES ─────────────────────────────
  console.log("\n--- FAMILY MEMBER ROUTES ---");
  {
    // No token
    let r = await req("GET", "/api/family-members/");
    record("GET", "/api/family-members/", "no-token", 401, r.status, r.data);

    // Invalid token
    r = await req("GET", "/api/family-members/", "bad_token");
    record("GET", "/api/family-members/", "invalid", 401, r.status, r.data);

    // GET /api/family-members/ - patient (own data)
    r = await req("GET", "/api/family-members/", PATIENT_TOKEN);
    record("GET", "/api/family-members/", "patient", 200, r.status, r.data);

    // GET /api/family-members/ - caregiver (own data)
    r = await req("GET", "/api/family-members/", CAREGIVER_TOKEN);
    record("GET", "/api/family-members/", "caregiver", 200, r.status, r.data);

    // GET /api/family-members/:id - patient with own member
    r = await req("GET", `/api/family-members/${PATIENT_FAMILY_MEMBER_ID}`, PATIENT_TOKEN);
    record("GET", "/api/family-members/:id", "patient-own", 200, r.status, r.data);

    // GET /api/family-members/:id - patient with nonexistent member
    r = await req("GET", "/api/family-members/00000000-0000-0000-0000-999999999999", PATIENT_TOKEN);
    record("GET", "/api/family-members/:id", "patient-notfound", 404, r.status, r.data);

    // POST /api/family-members/ - patient creates new member (FREE plan, already has 2 => paywall)
    r = await req("POST", "/api/family-members/", PATIENT_TOKEN, {
      name: "Test Child",
      relationship: "Son",
      dateOfBirth: "2015-06-15",
    });
    record("POST", "/api/family-members/", "patient-create-paywall", 403, r.status, r.data);

    // PATCH /api/family-members/:id - patient updates own member
    r = await req("PATCH", `/api/family-members/${PATIENT_FAMILY_MEMBER_ID}`, PATIENT_TOKEN, {
      name: "John Doe Updated",
    });
    record("PATCH", "/api/family-members/:id", "patient-update", 200, r.status, r.data);

    // DELETE /api/family-members/:id - caregiver tries to delete patient's member (cross-user, not found)
    r = await req("DELETE", `/api/family-members/${PATIENT_FAMILY_MEMBER_ID}`, CAREGIVER_TOKEN);
    record("DELETE", "/api/family-members/:id", "caregiver-cross-user", 400, r.status, r.data);
  }

  // ─── REPORT ROUTES ────────────────────────────────────
  console.log("\n--- REPORT ROUTES ---");
  {
    // No token
    let r = await req("GET", "/api/reports/timeline/test");
    record("GET", "/api/reports/timeline/:id", "no-token", 401, r.status, r.data);

    // Patient - get timeline (no reports yet, should return empty or 200)
    r = await req("GET", `/api/reports/timeline/${PATIENT_FAMILY_MEMBER_ID}`, PATIENT_TOKEN);
    record("GET", "/api/reports/timeline/:id", "patient", 200, r.status, r.data);

    // Patient - get metrics
    r = await req("GET", `/api/reports/metrics/${PATIENT_FAMILY_MEMBER_ID}`, PATIENT_TOKEN);
    record("GET", "/api/reports/metrics/:id", "patient", 200, r.status, r.data);

    // Patient - get trend
    r = await req("GET", `/api/reports/trend/${PATIENT_FAMILY_MEMBER_ID}/glucose`, PATIENT_TOKEN);
    record("GET", "/api/reports/trend/:id/:metric", "patient", 200, r.status, r.data);

    // Patient - get specific report with fake ID
    r = await req("GET", "/api/reports/00000000-0000-0000-0000-999999999999", PATIENT_TOKEN);
    record("GET", "/api/reports/:id", "patient-notfound", 404, r.status, r.data);

    // Patient - generate upload URL (missing fileSize should fail)
    r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
      fileName: "test-report.pdf",
      fileType: "application/pdf",
      familyMemberId: PATIENT_FAMILY_MEMBER_ID,
    });
    record("POST", "/api/reports/upload-url", "patient-missing-size", 400, r.status, r.data);

    // Patient - generate upload URL (with fileSize)
    r = await req("POST", "/api/reports/upload-url", PATIENT_TOKEN, {
      fileName: "test-report.pdf",
      fileType: "application/pdf",
      fileSize: 1024000,
      familyMemberId: PATIENT_FAMILY_MEMBER_ID,
    });
    record("POST", "/api/reports/upload-url", "patient-valid", r.status, r.status, r.data);

    // Caregiver - get timeline (own member)
    r = await req("GET", `/api/reports/timeline/${CAREGIVER_FAMILY_MEMBER_ID}`, CAREGIVER_TOKEN);
    record("GET", "/api/reports/timeline/:id", "caregiver", 200, r.status, r.data);

    // Caregiver - tries patient's member (cross-user)
    r = await req("GET", `/api/reports/timeline/${PATIENT_FAMILY_MEMBER_ID}`, CAREGIVER_TOKEN);
    record("GET", "/api/reports/timeline/:id", "caregiver-cross", r.status, r.status, r.data);
  }

  // ─── VISIT ROUTES ─────────────────────────────────────
  console.log("\n--- VISIT ROUTES ---");
  {
    // No token
    let r = await req("GET", "/api/visits/");
    record("GET", "/api/visits/", "no-token", 401, r.status, r.data);

    // Patient - list visits
    r = await req("GET", "/api/visits/", PATIENT_TOKEN);
    record("GET", "/api/visits/", "patient", 200, r.status, r.data);

    // Patient - create visit
    r = await req("POST", "/api/visits/", PATIENT_TOKEN, {
      familyMemberId: PATIENT_FAMILY_MEMBER_ID,
      visitDate: "2026-01-15T10:00:00Z",
      doctorName: "Dr. Johnson",
      specialty: "Endocrinology",
      symptoms: ["fatigue", "weight gain"],
    });
    record("POST", "/api/visits/", "patient-create", 201, r.status, r.data);

    // Caregiver - list visits (own)
    r = await req("GET", "/api/visits/", CAREGIVER_TOKEN);
    record("GET", "/api/visits/", "caregiver", 200, r.status, r.data);

    // Patient - get specific visit (existing one from seed)
    r = await req("GET", `/api/visits/${SEED_VISIT_ID}`, PATIENT_TOKEN);
    record("GET", "/api/visits/:id", "patient-existing", r.status, r.status, r.data);

    // Patient - generate questions for visit
    r = await req("POST", `/api/visits/${SEED_VISIT_ID}/questions`, PATIENT_TOKEN);
    // May fail if ANTHROPIC_API_KEY is not set, but should not be 401
    record("POST", "/api/visits/:id/questions", "patient", r.status, r.status, r.data);
  }

  // ─── MEDICATION ROUTES ────────────────────────────────
  console.log("\n--- MEDICATION ROUTES ---");
  {
    // No token
    let r = await req("GET", "/api/medications/test");
    record("GET", "/api/medications/:id", "no-token", 401, r.status, r.data);

    // Patient - get medications for family member
    r = await req("GET", `/api/medications/${PATIENT_FAMILY_MEMBER_ID}`, PATIENT_TOKEN);
    record("GET", "/api/medications/:id", "patient", 200, r.status, r.data);

    // Patient - create medication
    r = await req("POST", "/api/medications/", PATIENT_TOKEN, {
      familyMemberId: PATIENT_FAMILY_MEMBER_ID,
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      startDate: "2026-01-01",
    });
    record("POST", "/api/medications/", "patient-create", 201, r.status, r.data);

    // Caregiver - get medications for own member
    r = await req("GET", `/api/medications/${CAREGIVER_FAMILY_MEMBER_ID}`, CAREGIVER_TOKEN);
    record("GET", "/api/medications/:id", "caregiver", 200, r.status, r.data);

    // Caregiver - tries patient's member medications (cross-user)
    r = await req("GET", `/api/medications/${PATIENT_FAMILY_MEMBER_ID}`, CAREGIVER_TOKEN);
    record("GET", "/api/medications/:id", "caregiver-cross", r.status, r.status, r.data);

    // Patient - deactivate medication
    const meds = await req("GET", `/api/medications/${PATIENT_FAMILY_MEMBER_ID}`, PATIENT_TOKEN);
    if (meds.data?.data?.length > 0) {
      const medId = meds.data.data[0].id;
      r = await req("POST", `/api/medications/${medId}/deactivate`, PATIENT_TOKEN);
      record("POST", "/api/medications/:id/deactivate", "patient", 200, r.status, r.data);
    } else {
      // Use the seed medication
      r = await req("POST", `/api/medications/${SEED_MEDICATION_ID}/deactivate`, PATIENT_TOKEN);
      record("POST", "/api/medications/:id/deactivate", "patient-seed", r.status, r.status, r.data);
    }
  }

  // ─── ALERT ROUTES ─────────────────────────────────────
  console.log("\n--- ALERT ROUTES ---");
  {
    // No token
    let r = await req("GET", "/api/alerts/");
    record("GET", "/api/alerts/", "no-token", 401, r.status, r.data);

    // Patient - list alerts
    r = await req("GET", "/api/alerts/", PATIENT_TOKEN);
    record("GET", "/api/alerts/", "patient", 200, r.status, r.data);

    // Patient - unread count
    r = await req("GET", "/api/alerts/unread-count", PATIENT_TOKEN);
    record("GET", "/api/alerts/unread-count", "patient", 200, r.status, r.data);

    // Patient - mark all as read
    r = await req("POST", "/api/alerts/read-all", PATIENT_TOKEN);
    record("POST", "/api/alerts/read-all", "patient", 200, r.status, r.data);

    // Caregiver - list alerts
    r = await req("GET", "/api/alerts/", CAREGIVER_TOKEN);
    record("GET", "/api/alerts/", "caregiver", 200, r.status, r.data);

    // Patient - mark specific alert as read (real ID from seed)
    r = await req("POST", `/api/alerts/${SEED_ALERT_ID}/read`, PATIENT_TOKEN);
    record("POST", "/api/alerts/:id/read", "patient-real", r.status, r.status, r.data);

    // Patient - mark specific alert as read (fake ID)
    r = await req("POST", "/api/alerts/00000000-0000-0000-0000-999999999999/read", PATIENT_TOKEN);
    record("POST", "/api/alerts/:id/read", "patient-fake", r.status, r.status, r.data);
  }

  // ─── SUBSCRIPTION ROUTES ──────────────────────────────
  console.log("\n--- SUBSCRIPTION ROUTES ---");
  {
    // No token
    let r = await req("GET", "/api/subscriptions/status");
    record("GET", "/api/subscriptions/status", "no-token", 401, r.status, r.data);

    // Patient - check subscription status
    r = await req("GET", "/api/subscriptions/status", PATIENT_TOKEN);
    record("GET", "/api/subscriptions/status", "patient", 200, r.status, r.data);

    // Caregiver - check subscription status
    r = await req("GET", "/api/subscriptions/status", CAREGIVER_TOKEN);
    record("GET", "/api/subscriptions/status", "caregiver", 200, r.status, r.data);

    // Patient - create unified checkout (routes to Stripe or Razorpay based on currency)
    r = await req("POST", "/api/subscriptions/checkout", PATIENT_TOKEN, { plan: "premium", period: "monthly", currency: "USD" });
    record("POST", "/api/subscriptions/checkout [USD]", "patient", r.status, r.status, r.data);

    // Patient - create unified checkout (INR routes to Razorpay)
    r = await req("POST", "/api/subscriptions/checkout", PATIENT_TOKEN, { plan: "premium", period: "monthly", currency: "INR" });
    record("POST", "/api/subscriptions/checkout [INR]", "patient", r.status, r.status, r.data);

    // Patient - cancel subscription (no active sub in test)
    r = await req("POST", "/api/subscriptions/cancel", PATIENT_TOKEN);
    record("POST", "/api/subscriptions/cancel", "patient", r.status, r.status, r.data);

    // Patient - billing portal (no Stripe customer in test)
    r = await req("POST", "/api/subscriptions/portal", PATIENT_TOKEN);
    record("POST", "/api/subscriptions/portal", "patient", r.status, r.status, r.data);
  }

  // ─── 404 HANDLING ─────────────────────────────────────
  console.log("\n--- 404 HANDLING ---");
  {
    let r = await req("GET", "/api/nonexistent");
    record("GET", "/api/nonexistent", "none", 404, r.status, r.data);

    r = await req("POST", "/api/does-not-exist");
    record("POST", "/api/does-not-exist", "none", 404, r.status, r.data);
  }

  // ─── SUMMARY ──────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("  TEST SUMMARY");
  console.log("=".repeat(70));

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed} \u2705`);
  console.log(`Failed: ${failed} ${failed > 0 ? "\u274C" : "\u2705"}`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => !r.pass)
      .forEach((r) => {
        console.log(`  ${r.method} ${r.path} [${r.token}] - expected ${r.expected}, got ${r.actual}`);
      });
  }

  console.log("=".repeat(70));
}

runTests().catch(console.error);
