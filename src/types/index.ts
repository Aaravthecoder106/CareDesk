import { Request } from "express";

export interface AuthRequest extends Request {
  userId?: string;
  clerkId?: string;
  userPlan?: string;
  userRole?: string;
}

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface MetricInput {
  metricName: string;
  value: number;
  unit: string;
  normalRangeLow?: number;
  normalRangeHigh?: number;
  isAbnormal: boolean;
}

export interface AIAnalysisResult {
  summary: string;
  metrics: MetricInput[];
  anomalies: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
