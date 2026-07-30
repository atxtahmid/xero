import chatHistoryService from "./chatHistoryService.js";

export type GeminiPart = { text: string };
export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

class AIContextService {
  private readonly MAX_TOTAL_CHARS = 15000;

  async buildPrompt(userId: string, guildId: string, prompt: string): Promise<GeminiContent[]> {
    const history = await chatHistoryService.getConversation(userId, guildId);
    const messages: GeminiContent[] = [];
    let currentLength = prompt.length;

    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (currentLength + msg.content.length > this.MAX_TOTAL_CHARS) break;
      messages.unshift({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content.trim() }],
      });
      currentLength += msg.content.length;
    }

    messages.push({
      role: "user",
      parts: [{ text: prompt.trim() }],
    });

    return messages;
  }
}

export default new AIContextService();