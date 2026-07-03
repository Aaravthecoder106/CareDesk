import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { auditLog } from "../middleware/audit";
import {
  addMedication,
  getMedications,
  updateMedication,
  deactivateMedication,
} from "../controllers/medication";

const router = Router();

router.use(authenticate);

router.post("/", auditLog("medication", "CREATE"), addMedication);
router.get("/:familyMemberId", auditLog("medication", "READ"), getMedications);
router.patch("/:medId", auditLog("medication", "UPDATE"), updateMedication);
router.post("/:medId/deactivate", auditLog("medication", "UPDATE"), deactivateMedication);

export default router;
