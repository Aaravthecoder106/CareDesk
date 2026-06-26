import { AuthRequest } from "../types";
import { successResponse, errorResponse, parsePagination } from "../utils/responses";
import { reportService } from "../services/report";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getUploadUrl = async (req: AuthRequest, res: any) => {
  try {
    const { fileName, fileType, fileSize, familyMemberId } = req.body;

    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json(errorResponse("fileName is required and must be a string"));
    }
    if (fileName.length > 255) {
      return res.status(400).json(errorResponse("fileName must be 255 characters or less"));
    }
    if (!fileType || typeof fileType !== "string") {
      return res.status(400).json(errorResponse("fileType is required and must be a string"));
    }
    if (fileSize === undefined || fileSize === null || typeof fileSize !== "number" || fileSize <= 0) {
      return res.status(400).json(errorResponse("fileSize is required and must be a positive number"));
    }
    if (familyMemberId !== undefined && familyMemberId !== null && !UUID_REGEX.test(String(familyMemberId))) {
      return res.status(400).json(errorResponse("familyMemberId must be a valid UUID"));
    }

    const result = await reportService.getUploadUrl(
      req.userId!,
      fileName,
      fileType,
      fileSize,
      familyMemberId
    );
    res.json(successResponse(result));
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

export const processReport = async (req: AuthRequest, res: any) => {
  try {
    const reportId = String(req.params.reportId);
    if (!UUID_REGEX.test(reportId)) {
      return res.status(400).json(errorResponse("Invalid reportId: must be a valid UUID"));
    }

    const report = await reportService.processReport(
      req.userId!,
      reportId
    );
    res.json(successResponse(report, "Report processed successfully"));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getReport = async (req: AuthRequest, res: any) => {
  try {
    const reportId = String(req.params.reportId);
    if (!UUID_REGEX.test(reportId)) {
      return res.status(400).json(errorResponse("Invalid reportId: must be a valid UUID"));
    }

    const report = await reportService.getReport(req.userId!, reportId);
    res.json(successResponse(report));
  } catch (error) {
    res.status(404).json(errorResponse((error as Error).message));
  }
};

export const getTimeline = async (req: AuthRequest, res: any) => {
  try {
    const familyMemberId = String(req.params.familyMemberId);
    if (!UUID_REGEX.test(familyMemberId)) {
      return res.status(400).json(errorResponse("Invalid familyMemberId: must be a valid UUID"));
    }

    const { page, limit } = parsePagination(req.query as any);
    const result = await reportService.getTimeline(
      req.userId!,
      familyMemberId,
      page,
      limit
    );
    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getMetricTrend = async (req: AuthRequest, res: any) => {
  try {
    const familyMemberId = String(req.params.familyMemberId);
    if (!UUID_REGEX.test(familyMemberId)) {
      return res.status(400).json(errorResponse("Invalid familyMemberId: must be a valid UUID"));
    }

    const metricName = String(req.params.metricName);
    if (!metricName || metricName.length > 100) {
      return res.status(400).json(errorResponse("metricName is required and must be 100 characters or less"));
    }

    const trend = await reportService.getMetricTrend(
      req.userId!,
      familyMemberId,
      metricName
    );
    res.json(successResponse(trend));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getAvailableMetrics = async (req: AuthRequest, res: any) => {
  try {
    const familyMemberId = String(req.params.familyMemberId);
    if (!UUID_REGEX.test(familyMemberId)) {
      return res.status(400).json(errorResponse("Invalid familyMemberId: must be a valid UUID"));
    }

    const metrics = await reportService.getAvailableMetrics(
      req.userId!,
      familyMemberId
    );
    res.json(successResponse(metrics));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};
