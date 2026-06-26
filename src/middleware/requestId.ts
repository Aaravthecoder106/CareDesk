import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request { requestId: string; }
  }
}

export const requestId = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers["x-request-id"] as string | undefined;
  req.requestId = header ? header.replace(/[^\w\-]/g, "").substring(0, 64) || randomUUID() : randomUUID();
  next();
};
