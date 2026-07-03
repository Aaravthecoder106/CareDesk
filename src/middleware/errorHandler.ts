import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).requestId || "unknown";
  console.error(`[${requestId}] Unhandled error:`, err);

  if (err.name === "SyntaxError" && "body" in err) {
    return res.status(400).json({ success: false, error: "Invalid JSON", requestId });
  }
  if (err.name === "PayloadTooLargeError") {
    return res.status(413).json({ success: false, error: "Request body too large", requestId });
  }
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    switch (prismaErr.code) {
      case "P2002": return res.status(409).json({ success: false, error: "Duplicate record", requestId });
      case "P2025": return res.status(404).json({ success: false, error: "Record not found", requestId });
      case "P2003": return res.status(400).json({ success: false, error: "Foreign key constraint failed", requestId });
      default:
        return res.status(500).json({ success: false, error: process.env.NODE_ENV === "development" ? `Prisma error: ${prismaErr.code}` : "Internal error", requestId });
    }
  }
  if (err.name === "PrismaClientValidationError") {
    return res.status(400).json({ success: false, error: process.env.NODE_ENV === "development" ? err.message : "Invalid data", requestId });
  }

  const safeMessage = process.env.NODE_ENV === "development" ? err.message : "Internal server error";
  res.status(500).json({ success: false, error: safeMessage, requestId });
};

export const notFoundHandler = (req: Request, res: Response) => {
  const safePath = req.originalUrl.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/[uuid]").split("?")[0];
  res.status(404).json({ success: false, error: `Route not found`, path: safePath, requestId: (req as any).requestId || "unknown" });
};
