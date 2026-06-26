import { AuthRequest } from "../types";
import { successResponse, errorResponse, parsePagination } from "../utils/responses";
import { alertService } from "../services/alert";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getAlerts = async (req: AuthRequest, res: any) => {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const { page, limit } = parsePagination(req.query as any);
    const alerts = await alertService.getAlerts(req.userId!, unreadOnly, page, limit);
    res.json(successResponse(alerts));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const markAsRead = async (req: AuthRequest, res: any) => {
  try {
    const alertId = String(req.params.alertId);
    if (!UUID_REGEX.test(alertId)) {
      return res.status(400).json(errorResponse("Invalid alertId: must be a valid UUID"));
    }

    const alert = await alertService.markAsRead(req.userId!, alertId);
    res.json(successResponse(alert));
  } catch (error) {
    res.status(400).json(errorResponse((error as Error).message));
  }
};

export const markAllAsRead = async (req: AuthRequest, res: any) => {
  try {
    const result = await alertService.markAllAsRead(req.userId!);
    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getUnreadCount = async (req: AuthRequest, res: any) => {
  try {
    const count = await alertService.getUnreadCount(req.userId!);
    res.json(successResponse(count));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};
