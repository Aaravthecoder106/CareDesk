import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { errorResponse } from "../utils/responses";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(paramName: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const value = String(req.params[paramName] || "");
    if (!value || !UUID_REGEX.test(value)) {
      return res.status(400).json(errorResponse(`Invalid ${paramName}: must be a valid UUID`));
    }
    next();
  };
}

export function validateRequiredFields(...fields: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) {
        return res.status(400).json(errorResponse(`${field} is required`));
      }
    }
    next();
  };
}

export function validateStringField(field: string, maxLength = 255) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const value = req.body[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== "string") {
        return res.status(400).json(errorResponse(`${field} must be a string`));
      }
      if (value.length > maxLength) {
        return res.status(400).json(errorResponse(`${field} must be ${maxLength} characters or less`));
      }
    }
    next();
  };
}

export function validatePositiveNumber(field: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const value = req.body[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== "number" || value <= 0) {
        return res.status(400).json(errorResponse(`${field} must be a positive number`));
      }
    }
    next();
  };
}

export function validateArrayField(field: string, maxElements = 100) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const value = req.body[field];
    if (value !== undefined && value !== null) {
      if (!Array.isArray(value)) {
        return res.status(400).json(errorResponse(`${field} must be an array`));
      }
      if (value.length > maxElements) {
        return res.status(400).json(errorResponse(`${field} must have ${maxElements} elements or fewer`));
      }
    }
    next();
  };
}
