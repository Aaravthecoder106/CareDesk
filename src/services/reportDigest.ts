import prisma from "../utils/prisma";
import { analyzeReport } from "./ai";
import { sanitizeForPrompt } from "../utils/sanitize";

const DIGEST_PROMPT = `You are a medical report digest assistant. Analyze the following medical report and create a concise clinical digest.

Return a JSON response with this exact structure:
{
  "summary": "A 2-3 sentence clinical summary of key findings",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"]
}

Rules:
1. Focus on actionable findings
2. Note any abnormal values
3. Return ONLY valid JSON`;

export class ReportDigestService {
  async digestReport(reportId: string) {
    // Check if already digested
    const existing = await prisma.reportDigest.findUnique({ where: { reportId } });
    if (existing) return existing;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { metrics: true },
    });
    if (!report) throw new Error("Report not found");
    if (!report.processed) throw new Error("Report not yet processed");

    // Build content for AI
    let content = report.fileName;
    if (report.aiSummary) {
      content = report.aiSummary;
    } else if (report.rawMetrics) {
      content = JSON.stringify(report.rawMetrics);
    }

    try {
      const responseText = await callAI(DIGEST_PROMPT, `Report: ${report.fileName}\n\nContent:\n${sanitizeForPrompt(content)}`, 1024);
      const parsed = JSON.parse(responseText.trim());

      return await prisma.reportDigest.create({
        data: {
          reportId,
          userId: report.userId,
          categoryId: report.categoryId,
          summary: parsed.summary || report.aiSummary || "No summary available",
          keyFindings: parsed.keyFindings || [],
        },
      });
    } catch (error) {
      // Fallback: create digest from existing AI summary
      return await prisma.reportDigest.create({
        data: {
          reportId,
          userId: report.userId,
          categoryId: report.categoryId,
          summary: report.aiSummary || "Analysis pending",
          keyFindings: [],
        },
      });
    }
  }

  async getLatestDigests(userId: string, categoryId?: string, limit = 5) {
    const where: any = { userId };
    if (categoryId) where.categoryId = categoryId;

    return prisma.reportDigest.findMany({
      where,
      orderBy: { analyzedAt: "desc" },
      take: limit,
      include: {
        report: { select: { fileName: true, uploadDate: true } },
      },
    });
  }

  async getContextForChat(userId: string) {
    // Get latest 5 digests per category
    const categories = await prisma.category.findMany({ where: { userId } });
    const context: any[] = [];

    // Get uncategorized digests too
    const allDigests = await prisma.reportDigest.findMany({
      where: { userId },
      orderBy: { analyzedAt: "desc" },
      include: {
        report: { select: { fileName: true, uploadDate: true } },
        category: { select: { name: true } },
      },
    });

    // Group by category and take latest 5 each
    const grouped: Record<string, typeof allDigests> = {};
    for (const digest of allDigests) {
      const catName = digest.category?.name || "Uncategorized";
      if (!grouped[catName]) grouped[catName] = [];
      if (grouped[catName].length < 5) {
        grouped[catName].push(digest);
      }
    }

    return grouped;
  }
}

import { callAI } from "./ai";

export const reportDigestService = new ReportDigestService();
