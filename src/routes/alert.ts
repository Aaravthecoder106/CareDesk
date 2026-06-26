import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { auditLog } from "../middleware/audit";
import {
  getAlerts,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../controllers/alert";

const router = Router();

router.use(authenticate);

router.get("/", auditLog("alert", "READ"), getAlerts);
router.get("/unread-count", auditLog("alert", "READ"), getUnreadCount);
router.post("/read-all", auditLog("alert", "UPDATE"), markAllAsRead);
router.post("/:alertId/read", auditLog("alert", "UPDATE"), markAsRead);

export default router;
