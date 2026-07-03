import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { errorResponse } from "../utils/responses";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateUuid = (param: string) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!UUID.test(String(req.params[param] || ""))) {
    return res.status(400).json(errorResponse(`${param} must be a valid UUID`));
  }
  next();
};

export const validateRequired = (...fields: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  for (const f of fields) {
    const v = req.body[f];
    if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
      return res.status(400).json(errorResponse(`${f} is required`));
    }
  }
  next();
};

export const validateMaxLen = (field: string, max: number) => (req: AuthRequest, res: Response, next: NextFunction) => {
  const v = req.body[field];
  if (typeof v === "string" && v.length > max) {
    return res.status(400).json(errorResponse(`${field} must be ${max} characters or less`));
  }
  next();
};
