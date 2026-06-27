export interface User {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "CAREGIVER" | "DOCTOR";
  plan: "FREE" | "PREMIUM" | "FAMILY";
  onboarded: boolean;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  allergies: string[];
  heightCm: number | null;
  weightKg: number | null;
  createdAt: string;
  medications?: Medication[];
  _count?: { reports: number; visits: number };
}

export interface Report {
  id: string;
  userId: string;
  familyMemberId: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  aiSummary: string | null;
  rawMetrics: MetricInput[] | null;
  parsedMetrics: Record<string, unknown> | null;
  processed: boolean;
  processingError: string | null;
  metrics?: Metric[];
  familyMember?: { id: string; name: string; relationship?: string };
}

export interface Metric {
  id: string;
  reportId: string;
  metricName: string;
  value: number;
  unit: string;
  normalRangeLow: number | null;
  normalRangeHigh: number | null;
  isAbnormal: boolean;
  createdAt: string;
}

export interface MetricInput {
  metricName: string;
  value: number;
  unit: string;
  normalRangeLow?: number | null;
  normalRangeHigh?: number | null;
  isAbnormal: boolean;
}

export interface Visit {
  id: string;
  userId: string;
  familyMemberId: string | null;
  visitDate: string;
  doctorName: string | null;
  specialty: string | null;
  symptoms: string[];
  aiQuestions: string | null;
  doctorNotes: string | null;
  notes: string | null;
  summary: string | null;
  createdAt: string;
  familyMember?: { id: string; name: string; relationship?: string };
  parsedQuestions?: string[] | null;
}

export interface Medication {
  id: string;
  familyMemberId: string;
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  reminderEnabled: boolean;
  createdAt: string;
}

export interface Alert {
  id: string;
  familyMemberId: string;
  userId: string;
  alertType: "MEDICATION" | "ABNORMAL" | "APPOINTMENT";
  title: string;
  message: string;
  sentAt: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  familyMember?: { id: string; name: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubscriptionStatus {
  plan: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface MetricTrend {
  date: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  normalRangeLow: number | null;
  normalRangeHigh: number | null;
}

export interface GraphDataPoint {
  date: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  normalRangeLow: number | null;
  normalRangeHigh: number | null;
}

export interface TimelineEvent {
  id: string;
  type: "REPORT" | "VISIT" | "MEDICATION" | "ALERT";
  title: string;
  description: string | null;
  date: string;
  entityId: string;
  createdAt: string;
}
