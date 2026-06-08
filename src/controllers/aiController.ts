import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { askAI } from "../services/aiService";

export const askQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { question, history } = req.body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const safeHistory = (Array.isArray(history) ? history : [])
      .filter(
        (m: any) =>
          m &&
          typeof m === "object" &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.text === "string"
      )
      .slice(-6);

    const answer = await askAI(question.trim(), safeHistory);

    res.json({
      success: true,
      data: { answer },
    });
  } catch (error: any) {
    console.error("AI error:", error);

    if (error.message?.includes("GROQ_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "AI assistant is not configured. Contact the administrator.",
      });
    }

    const status = error.status || error.response?.status || error.statusCode;
    if (status === 429 || error.message?.toLowerCase().includes("quota") || error.message?.toLowerCase().includes("rate")) {
      return res.status(429).json({
        success: false,
        message: `AI assistant rate limit exceeded. ${error.message || "Please try again later."}`,
      });
    }

    if (status && status >= 400 && status < 500) {
      return res.status(status).json({
        success: false,
        message: error.message || "AI request failed",
      });
    }

    next(error);
  }
};
