import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { sendMessage, getHistory, clearHistory } from "../controllers/chat";

const router = Router();
router.use(authenticate);

router.post("/send", sendMessage);
router.get("/history", getHistory);
router.delete("/history", clearHistory);

export default router;
