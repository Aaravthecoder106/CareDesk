import { AuthRequest } from "../types";
import { successResponse, errorResponse } from "../utils/responses";
import { chatService } from "../services/chat";

export const sendMessage = async (req: AuthRequest, res: any) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json(errorResponse("message is required and must be a non-empty string"));
    }
    if (message.length > 2000) {
      return res.status(400).json(errorResponse("message must be 2000 characters or less"));
    }
    const reply = await chatService.sendMessage(req.userId!, message.trim());
    res.json(successResponse({ reply }));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const getHistory = async (req: AuthRequest, res: any) => {
  try {
    const limit = parseInt(String(req.query.limit)) || 50;
    const messages = await chatService.getHistory(req.userId!, Math.min(limit, 100));
    res.json(successResponse(messages));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};

export const clearHistory = async (req: AuthRequest, res: any) => {
  try {
    const result = await chatService.clearHistory(req.userId!);
    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse((error as Error).message));
  }
};
