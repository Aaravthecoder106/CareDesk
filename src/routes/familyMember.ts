import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} from "../controllers/familyMember";

const router = Router();

router.use(authenticate);

router.get("/", getMembers);
router.get("/:memberId", getMember);
router.post("/", createMember);
router.patch("/:memberId", updateMember);
router.delete("/:memberId", deleteMember);

export default router;
