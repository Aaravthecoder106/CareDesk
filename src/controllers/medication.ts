import { AuthRequest } from "../types";
import { successResponse, errorResponse } from "../utils/responses";
import { medicationService } from "../services/medication";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const addMedication = async (req: AuthRequest, res: any) => {
  try {
    const { familyMemberId, name, dosage, frequency, startDate, notes } = req.body;

    if (!familyMemberId || !UUID_REGEX.test(String(familyMemberId))) {
      return res.status(400).json(errorResponse("familyMemberId is required and must be a valid UUID"));
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json(errorResponse("name is required and must be a non-empty string"));
    }
    if (name.length > 200) {
      return res.status(400).json(errorResponse("name must be 200 characters or less"));
    }
    if (!dosage || typeof dosage !== "string" || dosage.trim().length === 0) {
      return res.status(400).json(errorResponse("dosage is required and must be a non-empty string"));
    }
    if (!frequency || typeof frequency !== "string" || frequency.trim().length === 0) {
      return res.status(400).json(errorResponse("frequency is required and must be a non-empty string"));
    }
    if (!startDate || typeof startDate !== "string") {
      return res.status(400).json(errorResponse("startDate is required and must be a string"));
    }
    const parsedDate = new Date(startDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json(errorResponse("Invalid startDate format"));
    }
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== "string") {
        return res.status(400).json(errorResponse("notes must be a string"));
      }
      if (notes.length > 5000) {
        return res.status(400).json(errorResponse("notes must be 5000 characters or less"));
      }
    }

    const medication = await medicationService.addMedication(req.userId!, req.body);
    res.status(201).json(successResponse(medication, "Medication added"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const getMedications = async (req: AuthRequest, res: any) => {
  try {
    const familyMemberId = String(req.params.familyMemberId);
    if (!UUID_REGEX.test(familyMemberId)) {
      return res.status(400).json(errorResponse("Invalid familyMemberId: must be a valid UUID"));
    }

    const medications = await medicationService.getMedications(
      req.userId!,
      familyMemberId
    );
    res.json(successResponse(medications));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const updateMedication = async (req: AuthRequest, res: any) => {
  try {
    const medId = String(req.params.medId);
    if (!UUID_REGEX.test(medId)) {
      return res.status(400).json(errorResponse("Invalid medId: must be a valid UUID"));
    }

    const { name, dosage, frequency, notes } = req.body;
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return res.status(400).json(errorResponse("name must be a non-empty string"));
    }
    if (name !== undefined && name.length > 200) {
      return res.status(400).json(errorResponse("name must be 200 characters or less"));
    }
    if (dosage !== undefined && (typeof dosage !== "string" || dosage.trim().length === 0)) {
      return res.status(400).json(errorResponse("dosage must be a non-empty string"));
    }
    if (frequency !== undefined && (typeof frequency !== "string" || frequency.trim().length === 0)) {
      return res.status(400).json(errorResponse("frequency must be a non-empty string"));
    }

    const medication = await medicationService.updateMedication(
      req.userId!,
      medId,
      req.body
    );
    res.json(successResponse(medication, "Medication updated"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const deactivateMedication = async (req: AuthRequest, res: any) => {
  try {
    const medId = String(req.params.medId);
    if (!UUID_REGEX.test(medId)) {
      return res.status(400).json(errorResponse("Invalid medId: must be a valid UUID"));
    }

    const medication = await medicationService.deactivateMedication(
      req.userId!,
      medId
    );
    res.json(successResponse(medication, "Medication deactivated"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};
