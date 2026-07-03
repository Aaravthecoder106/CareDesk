import prisma from "../utils/prisma";
import { generateVisitQuestions, summarizeVisit } from "./ai";

export class VisitService {
  async createVisit(
    userId: string,
    data: {
      familyMemberId?: string;
      visitDate: string;
      doctorName?: string;
      specialty?: string;
      symptoms: string[];
    }
  ) {
    if (!data.visitDate) throw new Error("visitDate is required");
    const visitDate = new Date(data.visitDate);
    if (isNaN(visitDate.getTime())) throw new Error("Invalid visit date");
    if (visitDate > new Date()) throw new Error("visitDate cannot be in the future");

    if (!data.symptoms || !Array.isArray(data.symptoms) || data.symptoms.length === 0) {
      throw new Error("At least one symptom is required");
    }
    for (const s of data.symptoms) {
      if (typeof s !== "string" || s.trim().length === 0) {
        throw new Error("Each symptom must be a non-empty string");
      }
    }

    if (data.familyMemberId) {
      const member = await prisma.familyMember.findFirst({
        where: { id: data.familyMemberId, userId },
      });
      if (!member) throw new Error("Family member not found");
    }

    return prisma.visit.create({
      data: {
        userId,
        familyMemberId: data.familyMemberId || null,
        visitDate,
        doctorName: data.doctorName,
        specialty: data.specialty,
        symptoms: data.symptoms,
      },
    });
  }

  async generateQuestions(visitId: string, userId: string) {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, userId },
      include: {
        familyMember: true,
      },
    });
    if (!visit) throw new Error("Visit not found");

    const recentMetrics = await prisma.metric.findMany({
      where: {
        report: {
          userId,
          familyMemberId: visit.familyMemberId,
        },
      },
      include: { report: { select: { uploadDate: true } } },
      orderBy: { report: { uploadDate: "desc" } },
      take: 10,
    });

    const metricsText = recentMetrics.map(
      (m: any) => `${m.metricName}: ${m.value}${m.unit}`
    );

    const conditions = recentMetrics
      .filter((m: any) => m.isAbnormal)
      .map((m: any) => `${m.metricName} (${m.value}${m.unit} - abnormal)`);

    const questions = await generateVisitQuestions(
      visit.symptoms,
      metricsText,
      conditions
    );

    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: { aiQuestions: JSON.stringify(questions) },
    });

    return { ...updatedVisit, questions };
  }

  async addDoctorNotes(
    visitId: string,
    userId: string,
    doctorNotes: string
  ) {
    if (!doctorNotes || typeof doctorNotes !== "string" || doctorNotes.trim().length === 0) {
      throw new Error("Doctor notes are required");
    }
    if (doctorNotes.length > 50000) {
      throw new Error("Doctor notes must be 50,000 characters or less");
    }

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, userId },
    });
    if (!visit) throw new Error("Visit not found");

    const summary = await summarizeVisit(doctorNotes.trim());

    return prisma.visit.update({
      where: { id: visitId },
      data: { doctorNotes: doctorNotes.trim(), summary },
    });
  }

  async getVisit(visitId: string, userId: string) {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, userId },
      include: {
        familyMember: { select: { id: true, name: true, relationship: true } },
      },
    });
    if (!visit) throw new Error("Visit not found");

    let parsedQuestions: string[] | null = null;
    if (visit.aiQuestions) {
      try {
        parsedQuestions = JSON.parse(visit.aiQuestions);
      } catch {
        parsedQuestions = null;
      }
    }

    return { ...visit, parsedQuestions };
  }

  async getVisits(
    userId: string,
    familyMemberId?: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(familyMemberId && { familyMemberId }),
    };

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          familyMember: { select: { id: true, name: true } },
        },
        orderBy: { visitDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.visit.count({ where }),
    ]);

    const visitsWithParsed = visits.map((v) => {
      let parsedQuestions: string[] | null = null;
      if (v.aiQuestions) {
        try {
          parsedQuestions = JSON.parse(v.aiQuestions);
        } catch {
          parsedQuestions = null;
        }
      }
      return { ...v, parsedQuestions };
    });

    return {
      data: visitsWithParsed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const visitService = new VisitService();
