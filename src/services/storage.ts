import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withTimeout, withRetry, r2CircuitBreaker } from "../utils/retry";
import crypto from "crypto";

const isRealR2 =
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_PUBLIC_URL &&
  !process.env.R2_ACCOUNT_ID.includes("xxx") &&
  !process.env.R2_ACCESS_KEY_ID.includes("xxx");

let r2: S3Client | null = null;
let BUCKET = "";

if (isRealR2) {
  r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    requestHandler: { requestTimeout: 10000 },
  });
  BUCKET = process.env.R2_BUCKET_NAME!;
  console.log("[Storage] R2 mode: LIVE");
} else {
  console.log("[Storage] R2 mode: MOCK (no real keys found — uploads return local mock URLs)");
}

const R2_TIMEOUT = 10000;

function callR2<T>(fn: () => Promise<T>): Promise<T> {
  if (!r2) throw new Error("R2 not configured");
  return callWithCircuitBreaker(r2CircuitBreaker, fn);
}

function callWithCircuitBreaker<T>(
  breaker: { isOpen: () => boolean; recordSuccess: () => void; recordFailure: () => void },
  fn: () => Promise<T>
): Promise<T> {
  if (breaker.isOpen()) throw new Error("R2 circuit breaker open");
  return fn().then(
    (r) => {
      breaker.recordSuccess();
      return r;
    },
    (e) => {
      breaker.recordFailure();
      throw e;
    }
  );
}

export async function generateUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; fileUrl: string }> {
  if (!isRealR2 || !r2) {
    const mockUrl = `https://mock-storage.caredesk.local/${key}`;
    return { uploadUrl: mockUrl, fileUrl: mockUrl };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await withRetry(
    () =>
      withTimeout(() => callR2(() => getSignedUrl(r2!, command, { expiresIn: 300 })), R2_TIMEOUT),
    { maxAttempts: 2 }
  );
  return { uploadUrl, fileUrl: `${process.env.R2_PUBLIC_URL}/${key}` };
}

export async function getFileUrl(key: string): Promise<string> {
  if (!isRealR2 || !r2) {
    return `https://mock-storage.caredesk.local/${key}`;
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return withRetry(
    () =>
      withTimeout(() => callR2(() => getSignedUrl(r2!, command, { expiresIn: 3600 })), R2_TIMEOUT),
    { maxAttempts: 2 }
  );
}

export function generateReportKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .substring(0, 100);
  const lastDot = safeName.lastIndexOf(".");
  const ext = lastDot > 0 ? safeName.substring(lastDot + 1) : "bin";
  const base = lastDot > 0 ? safeName.substring(0, lastDot) : safeName;
  const randomId = crypto.randomUUID().substring(0, 8);
  return `reports/${userId}/${timestamp}-${base}-${randomId}.${ext}`;
}
