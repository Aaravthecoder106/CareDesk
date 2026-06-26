import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { auditLog } from "../middleware/audit";
import {
  getUploadUrl,
  processReport,
  getReport,
  getTimeline,
  getMetricTrend,
  getAvailableMetrics,
} from "../controllers/report";

const router = Router();

router.use(authenticate);

router.post("/upload-url", auditLog("report", "CREATE"), getUploadUrl);
router.post("/:reportId/process", auditLog("report", "UPDATE"), processReport);
router.get("/:reportId", auditLog("report", "READ"), getReport);
router.get("/timeline/:familyMemberId", auditLog("report", "READ"), getTimeline);
router.get("/trend/:familyMemberId/:metricName", auditLog("metric", "READ"), getMetricTrend);
router.get("/metrics/:familyMemberId", auditLog("metric", "READ"), getAvailableMetrics);

export default router;
