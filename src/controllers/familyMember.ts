import { AuthRequest } from "../types";
import { successResponse, errorResponse } from "../utils/responses";
import { familyMemberService } from "../services/familyMember";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getMembers = async (req: AuthRequest, res: any) => {
  try {
    const members = await familyMemberService.getMembers(req.userId!);
    res.json(successResponse(members));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getMember = async (req: AuthRequest, res: any) => {
  try {
    const memberId = String(req.params.memberId);
    if (!UUID_REGEX.test(memberId)) {
      return res.status(400).json(errorResponse("Invalid memberId: must be a valid UUID"));
    }

    const member = await familyMemberService.getMember(
      req.userId!,
      memberId
    );
    res.json(successResponse(member));
  } catch (error) {
    res.status(404).json(errorResponse((error as Error).message));
  }
};

export const createMember = async (req: AuthRequest, res: any) => {
  try {
    const { name, relationship, dateOfBirth } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json(errorResponse("name is required and must be a non-empty string"));
    }
    if (name.length > 100) {
      return res.status(400).json(errorResponse("name must be 100 characters or less"));
    }
    if (!relationship || typeof relationship !== "string" || relationship.trim().length === 0) {
      return res.status(400).json(errorResponse("relationship is required and must be a non-empty string"));
    }
    if (relationship.length > 255) {
      return res.status(400).json(errorResponse("relationship must be 255 characters or less"));
    }
    if (dateOfBirth !== undefined && dateOfBirth !== null) {
      if (typeof dateOfBirth !== "string") {
        return res.status(400).json(errorResponse("dateOfBirth must be a string"));
      }
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json(errorResponse("Invalid dateOfBirth format"));
      }
    }

    const member = await familyMemberService.createMember(req.userId!, { name, relationship, dateOfBirth });
    res.status(201).json(successResponse(member, "Family member added"));
  } catch (error) {
    const err = error as any;
    if (err.code === "PAYWALL") {
      return res.status(403).json({
        success: false,
        error: err.message,
        code: err.code,
        trigger: err.trigger,
      });
    }
    res.status(400).json(errorResponse(err.message));
  }
};

export const updateMember = async (req: AuthRequest, res: any) => {
  try {
    const memberId = String(req.params.memberId);
    if (!UUID_REGEX.test(memberId)) {
      return res.status(400).json(errorResponse("Invalid memberId: must be a valid UUID"));
    }

    const { name, relationship, dateOfBirth } = req.body;
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return res.status(400).json(errorResponse("name must be a non-empty string"));
    }
    if (name !== undefined && name.length > 100) {
      return res.status(400).json(errorResponse("name must be 100 characters or less"));
    }
    if (relationship !== undefined && (typeof relationship !== "string" || relationship.trim().length === 0)) {
      return res.status(400).json(errorResponse("relationship must be a non-empty string"));
    }
    if (relationship !== undefined && relationship.length > 255) {
      return res.status(400).json(errorResponse("relationship must be 255 characters or less"));
    }
    if (dateOfBirth !== undefined && dateOfBirth !== null) {
      if (typeof dateOfBirth !== "string") {
        return res.status(400).json(errorResponse("dateOfBirth must be a string"));
      }
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json(errorResponse("Invalid dateOfBirth format"));
      }
    }

    const member = await familyMemberService.updateMember(
      req.userId!,
      memberId,
      req.body
    );
    res.json(successResponse(member, "Family member updated"));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const deleteMember = async (req: AuthRequest, res: any) => {
  try {
    const memberId = String(req.params.memberId);
    if (!UUID_REGEX.test(memberId)) {
      return res.status(400).json(errorResponse("Invalid memberId: must be a valid UUID"));
    }

    const result = await familyMemberService.deleteMember(
      req.userId!,
      memberId
    );
    res.json(successResponse(result));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};
