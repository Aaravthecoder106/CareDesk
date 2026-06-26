import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withTimeout, withRetry, r2CircuitBreaker } from "../utils/retry";
import crypto from "crypto";

if (!process.env.R2_ACCOUNT_ID) throw new Error("R2_ACCOUNT_ID required");
if (!process.env.R2_ACCESS_KEY_ID) throw new Error("R2_ACCESS_KEY_ID required");
if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error("R2_SECRET_ACCESS_KEY required");
if (!process.env.R2_BUCKET_NAME) throw new Error("R2_BUCKET_NAME required");
if (!process.env.R2_PUBLIC_URL) throw new Error("R2_PUBLIC_URL required");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  requestHandler: { requestTimeout: 10000 },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const R2_TIMEOUT = 10000;

function callR2<T>(fn: () => Promise<T>): Promise<T> {
  return callWithCircuitBreaker(r2CircuitBreaker, fn);
}

function callWithCircuitBreaker<T>(breaker: { isOpen: () => boolean; recordSuccess: () => void; recordFailure: () => void }, fn: () => Promise<T>): Promise<T> {
  if (breaker.isOpen()) throw new Error("R2 circuit breaker open");
  return fn().then(r => { breaker.recordSuccess(); return r; }, e => { breaker.recordFailure(); throw e; });
}

export async function generateUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await withRetry(
    () => withTimeout(() => callR2(() => getSignedUrl(r2, command, { expiresIn: 300 })), R2_TIMEOUT),
    { maxAttempts: 2 }
  );
  return { uploadUrl, fileUrl: `${process.env.R2_PUBLIC_URL}/${key}` };
}

export async function getFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return withRetry(
    () => withTimeout(() => callR2(() => getSignedUrl(r2, command, { expiresIn: 3600 })), R2_TIMEOUT),
    { maxAttempts: 2 }
  );
}

export function generateReportKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").replace(/^\.+/, "").substring(0, 100);
  const lastDot = safeName.lastIndexOf(".");
  const ext = lastDot > 0 ? safeName.substring(lastDot + 1) : "bin";
  const base = lastDot > 0 ? safeName.substring(0, lastDot) : safeName;
  const randomId = crypto.randomUUID().substring(0, 8);
  return `reports/${userId}/${timestamp}-${base}-${randomId}.${ext}`;
}
