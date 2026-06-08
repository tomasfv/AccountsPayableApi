import express from "express";
import { askQuestion } from "../controllers/aiController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/ask", protect as any, askQuestion as any);

export default router;
