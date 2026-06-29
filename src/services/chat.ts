import prisma from "../utils/prisma";
import { callAI } from "./ai";
import { reportDigestService } from "./reportDigest";
import { sanitizeForPrompt } from "../utils/sanitize";

const SYSTEM_PROMPT = `You are CareDesk AI, a friendly medical health assistant. You help users understand their medical reports, health metrics, and provide general health information.

IMPORTANT RULES:
1. You are NOT a doctor. Always remind users to consult healthcare professionals for medical advice.
2. Be friendly, conversational, and supportive.
3. Use the report context provided to give personalized insights.
4. If you don't have enough context, say so honestly.
5. Never diagnose conditions or prescribe treatments.
6. Keep responses concise and easy to understand.`;

export class ChatService {
  async sendMessage(userId: string, message: string) {
    // Save user message
    await prisma.chatMessage.create({
      data: { userId, role: "user", content: message },
    });

    // Get context from latest 5 digests per category
    const context = await reportDigestService.getContextForChat(userId);
    
    // Build context string
    let contextStr = "";
    for (const [category, digests] of Object.entries(context)) {
      contextStr += `\n\n## ${category} Reports:\n`;
      for (const d of digests) {
        contextStr += `- ${d.report.fileName} (${new Date(d.report.uploadDate).toLocaleDateString()}): ${d.summary}\n`;
        if (d.keyFindings && Array.isArray(d.keyFindings) && d.keyFindings.length > 0) {
          contextStr += `  Key findings: ${d.keyFindings.join(", ")}\n`;
        }
      }
    }

    // Get recent chat history (last 10 messages)
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    recentMessages.reverse();

    const historyStr = recentMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    const fullPrompt = contextStr
      ? `Here is the user's medical context:\n${contextStr}\n\nChat history:\n${historyStr}\n\nUser: ${sanitizeForPrompt(message)}\n\nRespond as CareDesk AI:`
      : `No medical reports uploaded yet. The user says: ${sanitizeForPrompt(message)}\n\nRespond as CareDesk AI:`;

    try {
      const reply = await callAI(SYSTEM_PROMPT, fullPrompt, 1024);
      
      // Save assistant reply
      await prisma.chatMessage.create({
        data: { userId, role: "assistant", content: reply },
      });

      return reply;
    } catch (error) {
      const fallback = "I'm having trouble processing your request right now. Please try again later.";
      await prisma.chatMessage.create({
        data: { userId, role: "assistant", content: fallback },
      });
      return fallback;
    }
  }

  async getHistory(userId: string, limit = 50) {
    return prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async clearHistory(userId: string) {
    await prisma.chatMessage.deleteMany({ where: { userId } });
    return { message: "Chat history cleared" };
  }
}

export const chatService = new ChatService();
