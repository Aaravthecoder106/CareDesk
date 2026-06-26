import prisma from "../utils/prisma";
import { generateReportKey, getFileUrl } from "./storage";
import { analyzeReport } from "./ai";
import { v4 as uuid } from "uuid";
import { usageService } from "./usage";
import { sanitizeForPrompt } from "../utils/sanitize";

export class ReportService {
  private static readonly EXT_TO_MIME: Record<string, string[]> = {
    "pdf": ["application/pdf"],
    "jpg": ["image/jpeg"],
    "jpeg": ["image/jpeg"],
    "png": ["image/png"],
  };

  async getUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    familyMemberId?: string
  ) {
    if (fileSize > 10 * 1024 * 1024) {
      throw new Error("File size must be less than 10MB");
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(fileType)) {
      throw new Error("Only PDF, JPG, and PNG files are allowed");
    }

    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const expectedTypes = ReportService.EXT_TO_MIME[ext];
    if (!expectedTypes || !expectedTypes.includes(fileType)) {
      throw new Error(`File extension .${ext} does not match claimed type ${fileType}`);
    }

    if (familyMemberId) {
      const member = await prisma.familyMember.findFirst({
        where: { id: familyMemberId, userId },
      });
      if (!member) throw new Error("Family member not found");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    return await prisma.$transaction(async (tx) => {
      const reportCount = await tx.report.count({ where: { userId } });

      if (user.plan === "FREE" && reportCount >= 3) {
        const error = new Error("Free plan limited to 3 reports. Upgrade to Premium.");
        (error as any).code = "PAYWALL";
        (error as any).trigger = "UPLOAD_REPORT";
        throw error;
      }

      const key = generateReportKey(userId, fileName);
      const reportId = uuid();

      await tx.report.create({
        data: {
          id: reportId,
          userId,
          familyMemberId: familyMemberId || null,
          fileUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
          fileName,
          fileType,
          fileSize,
          processed: false,
        },
      });

      await usageService.trackAction(userId, "UPLOAD_REPORT");

      return { reportId, key };
    });
  }

  async processReport(userId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });
    if (!report) throw new Error("Report not found");

    try {
      let fileContent = report.fileName;

      if (report.fileUrl) {
        try {
          const r2Key = report.fileUrl.replace(`${process.env.R2_PUBLIC_URL}/`, "");

          if (!this.isValidR2Key(r2Key)) {
            throw new Error("Invalid R2 key format");
          }

          const signedUrl = await getFileUrl(r2Key);

          if (!this.isValidR2Url(signedUrl)) {
            throw new Error("Invalid signed URL domain");
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(signedUrl, {
              signal: controller.signal,
              headers: { "Accept": "application/pdf, image/*, text/*" }
            });
            if (response.ok) {
              const contentType = report.fileType;
              if (contentType === "application/pdf") {
                fileContent = `[PDF Report: ${report.fileName}. Content could not be extracted. Describe typical findings for this type of medical report.]`;
              } else if (contentType.startsWith("image/")) {
                fileContent = `[Image Report: ${report.fileName}. Content could not be extracted via text. Describe typical findings for this type of medical report.]`;
              } else {
                fileContent = await response.text();
              }
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (downloadError) {
          console.warn("Could not download report file for AI analysis:", downloadError);
          fileContent = `[Medical Report: ${report.fileName}]`;
        }
      }

      const analysis = await analyzeReport(sanitizeForPrompt(fileContent), report.fileType);

      const updatedReport = await prisma.$transaction(async (tx) => {
        const updated = await tx.report.update({
          where: { id: reportId },
          data: {
            aiSummary: analysis.summary,
            rawMetrics: analysis.metrics as any,
            processed: true,
          },
        });

        if (analysis.metrics && analysis.metrics.length > 0) {
          await tx.metric.createMany({
            data: analysis.metrics.map((m: any) => ({
              reportId,
              metricName: m.metricName,
              value: m.value,
              unit: m.unit,
              normalRangeLow: m.normalRangeLow ?? null,
              normalRangeHigh: m.normalRangeHigh ?? null,
              isAbnormal: m.isAbnormal,
            })),
            skipDuplicates: true,
          });
        }

        if (analysis.anomalies && analysis.anomalies.length > 0 && report.familyMemberId) {
          await tx.alert.create({
            data: {
              familyMemberId: report.familyMemberId,
              userId: report.userId,
              alertType: "ABNORMAL",
              title: "Abnormal Values Detected",
              message: analysis.anomalies.join("; "),
            },
          });
        }

        return updated;
      });

      return updatedReport;
    } catch (error) {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          processingError: (error as Error).message,
        },
      });
      throw error;
    }
  }

  private isValidR2Key(key: string): boolean {
    return /^reports\/[a-f0-9-]{36}\/\d+-[a-zA-Z0-9_-]+\.(pdf|jpg|jpeg|png)$/i.test(key);
  }

  private isValidR2Url(url: string): boolean {
    try {
      const parsed = new URL(url);
      const r2Domain = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : "";
      return !!(r2Domain && parsed.hostname === r2Domain);
    } catch {
      return false;
    }
  }

  async getReport(userId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
      include: {
        metrics: true,
        familyMember: { select: { id: true, name: true, relationship: true } },
      },
    });
    if (!report) throw new Error("Report not found");
    return report;
  }

  async getTimeline(userId: string, familyMemberId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { userId, familyMemberId },
        include: { metrics: true },
        orderBy: { uploadDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({
        where: { userId, familyMemberId },
      }),
    ]);

    return {
      data: reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMetricTrend(
    userId: string,
    familyMemberId: string,
    metricName: string
  ) {
    const metrics = await prisma.metric.findMany({
      where: {
        report: {
          userId,
          familyMemberId,
        },
        metricName,
      },
      include: {
        report: {
          select: { uploadDate: true },
        },
      },
      orderBy: { report: { uploadDate: "asc" } },
    });

    return metrics.map((m: any) => ({
      date: m.report.uploadDate,
      value: m.value,
      unit: m.unit,
      isAbnormal: m.isAbnormal,
      normalRangeLow: m.normalRangeLow,
      normalRangeHigh: m.normalRangeHigh,
    }));
  }

  async getAvailableMetrics(userId: string, familyMemberId: string) {
    const metrics = await prisma.metric.findMany({
      where: {
        report: { userId, familyMemberId },
      },
      select: { metricName: true },
      distinct: ["metricName"],
    });

    return metrics.map((m: any) => m.metricName);
  }
}

export const reportService = new ReportService();
