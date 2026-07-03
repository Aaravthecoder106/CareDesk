import { AuthRequest } from "../types";
import { successResponse, errorResponse, parsePagination } from "../utils/responses";
import { visitService } from "../services/visit";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_SPECIALTIES = ["CARDIOLOGY", "NEUROLOGY", "ORTHOPEDICS", "PEDIATRICS", "DERMATOLOGY", "OPHTHALMOLOGY", "ENT", "GASTROENTEROLOGY", "PULMONOLOGY", "ENDOCRINOLOGY", "GENERAL"];

export const createVisit = async (req: AuthRequest, res: any) => {
  try {
    const { familyMemberId, visitDate, doctorName, specialty, symptoms } = req.body;

    if (!visitDate || typeof visitDate !== "string") {
      return res.status(400).json(errorResponse("visitDate is required and must be a string"));
    }
    const parsedDate = new Date(visitDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json(errorResponse("Invalid visitDate format"));
    }
    if (parsedDate > new Date()) {
      return res.status(400).json(errorResponse("visitDate cannot be in the future"));
    }
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json(errorResponse("symptoms is required and must be a non-empty array"));
    }
    for (const s of symptoms) {
      if (typeof s !== "string" || s.trim().length === 0) {
        return res.status(400).json(errorResponse("Each symptom must be a non-empty string"));
      }
    }
    if (familyMemberId !== undefined && familyMemberId !== null && !UUID_REGEX.test(String(familyMemberId))) {
      return res.status(400).json(errorResponse("familyMemberId must be a valid UUID"));
    }
    if (doctorName !== undefined && doctorName !== null) {
      if (typeof doctorName !== "string") {
        return res.status(400).json(errorResponse("doctorName must be a string"));
      }
      if (doctorName.length > 255) {
        return res.status(400).json(errorResponse("doctorName must be 255 characters or less"));
      }
    }
    if (specialty !== undefined && specialty !== null) {
      if (typeof specialty !== "string") {
        return res.status(400).json(errorResponse("specialty must be a string"));
      }
    }

    const visit = await visitService.createVisit(req.userId!, req.body);
    res.status(201).json(successResponse(visit, "Visit logged"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const generateQuestions = async (req: AuthRequest, res: any) => {
  try {
    const visitId = String(req.params.visitId);
    if (!UUID_REGEX.test(visitId)) {
      return res.status(400).json(errorResponse("Invalid visitId: must be a valid UUID"));
    }

    const result = await visitService.generateQuestions(
      visitId,
      req.userId!
    );
    res.json(successResponse(result));
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes("not found")) {
      res.status(404).json(errorResponse(msg));
    } else {
      res.status(500).json(errorResponse(msg));
    }
  }
};

export const addDoctorNotes = async (req: AuthRequest, res: any) => {
  try {
    const visitId = String(req.params.visitId);
    if (!UUID_REGEX.test(visitId)) {
      return res.status(400).json(errorResponse("Invalid visitId: must be a valid UUID"));
    }

    if (!req.body || !req.body.doctorNotes || typeof req.body.doctorNotes !== "string" || req.body.doctorNotes.trim().length === 0) {
      return res.status(400).json(errorResponse("doctorNotes is required and must be a non-empty string"));
    }
    if (req.body.doctorNotes.length > 50000) {
      return res.status(400).json(errorResponse("doctorNotes must be 50,000 characters or less"));
    }

    const visit = await visitService.addDoctorNotes(
      visitId,
      req.userId!,
      req.body.doctorNotes
    );
    res.json(successResponse(visit, "Doctor notes saved and summarized"));
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes("required") || msg.includes("must be") || msg.includes("cannot be") || msg.includes("not found") || msg.includes("Visit not found")) {
      res.status(400).json(errorResponse(msg));
    } else {
      res.status(500).json(errorResponse(msg));
    }
  }
};

export const getVisit = async (req: AuthRequest, res: any) => {
  try {
    const visitId = String(req.params.visitId);
    if (!UUID_REGEX.test(visitId)) {
      return res.status(400).json(errorResponse("Invalid visitId: must be a valid UUID"));
    }

    const visit = await visitService.getVisit(visitId, req.userId!);
    res.json(successResponse(visit));
  } catch (error) {
    res.status(404).json(errorResponse((error as Error).message));
  }
};

export const getVisits = async (req: AuthRequest, res: any) => {
  try {
    const { page, limit } = parsePagination(req.query as any);
    const familyMemberId = req.query.familyMemberId as string | undefined;
    if (familyMemberId !== undefined && !UUID_REGEX.test(familyMemberId)) {
      return res.status(400).json(errorResponse("Invalid familyMemberId: must be a valid UUID"));
    }

    const result = await visitService.getVisits(
      req.userId!,
      familyMemberId,
      page,
      limit
    );
    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};
