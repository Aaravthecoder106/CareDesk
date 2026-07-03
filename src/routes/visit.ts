import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { auditLog } from "../middleware/audit";
import {
  createVisit,
  generateQuestions,
  addDoctorNotes,
  getVisit,
  getVisits,
} from "../controllers/visit";

const router = Router();

router.use(authenticate);

router.post("/", auditLog("visit", "CREATE"), createVisit);
router.get("/", auditLog("visit", "READ"), getVisits);
router.get("/:visitId", auditLog("visit", "READ"), getVisit);
router.post("/:visitId/questions", auditLog("visit", "UPDATE"), generateQuestions);
router.post("/:visitId/notes", auditLog("visit", "UPDATE"), addDoctorNotes);

export default router;
