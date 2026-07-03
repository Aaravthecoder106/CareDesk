import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";

type AuditAction = "READ" | "CREATE" | "UPDATE" | "DELETE";

interface AuditEntry {
  timestamp: string;
  userId?: string;
  requestId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ip: string;
  method: string;
  path: string;
  statusCode?: number;
}

function sanitizeAuditData(entry: AuditEntry): AuditEntry {
  return {
    ...entry,
    path: entry.path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/[uuid]"),
  };
}

export function auditLog(resource: string, action: AuditAction) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId: req.userId,
        requestId: req.requestId,
        action,
        resource,
        resourceId: String(req.params.reportId || req.params.visitId || req.params.memberId || req.params.medId || req.params.alertId || ""),
        ip: (typeof req.ip === "string" ? req.ip : req.socket.remoteAddress) || "unknown",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
      };

      const sanitized = sanitizeAuditData(entry);
      console.log(`[AUDIT] ${JSON.stringify(sanitized)}`);
    });

    next();
  };
}
