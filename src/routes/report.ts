import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { auditLog } from "../middleware/audit";
import {
  getAllReports,
  getJourney,
  getUploadUrl,
  processReport,
  getReport,
  getTimeline,
  getMetricTrend,
  getAvailableMetrics,
  assignCategory,
} from "../controllers/report";

const router = Router();
router.use(authenticate);

router.get("/", auditLog("report", "READ"), getAllReports);
router.get("/journey", auditLog("report", "READ"), getJourney);
router.post("/upload-url", auditLog("report", "CREATE"), getUploadUrl);
router.post("/:reportId/process", auditLog("report", "UPDATE"), processReport);
router.post("/:reportId/category", auditLog("report", "UPDATE"), assignCategory);
router.get("/:reportId", auditLog("report", "READ"), getReport);
router.get("/timeline/:familyMemberId", auditLog("report", "READ"), getTimeline);
router.get("/trend/:familyMemberId/:metricName", auditLog("metric", "READ"), getMetricTrend);
router.get("/metrics/:familyMemberId", auditLog("metric", "READ"), getAvailableMetrics);

export default router;
