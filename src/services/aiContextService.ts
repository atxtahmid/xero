import chatHistoryService from "./chatHistoryService.js";

export interface GeminiPart {
  text: string;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

class AIContextService {
  private readonly MAX_TOTAL_CHARS = 15000;

  async buildPrompt(
    userId: string,
    guildId: string,
    prompt: string,
  ): Promise<GeminiContent[]> {
    const cleanPrompt = prompt.trim();

    const history = await chatHistoryService.getConversation(userId, guildId);

    const messages: GeminiContent[] = [];
    let currentLength = cleanPrompt.length;

    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const content = msg.content.trim();

      if (!content) continue;

      if (currentLength + content.length > this.MAX_TOTAL_CHARS) break;

      messages.unshift({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: content }],
      });

      currentLength += content.length;
    }

    messages.push({
      role: "user",
      parts: [{ text: cleanPrompt }],
    });

    return messages;
  }
}

export default new AIContextService();