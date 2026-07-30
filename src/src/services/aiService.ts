import aiContextService from "./aiContextService.js";
import chatHistoryService from "./chatHistoryService.js";
import geminiService from "./geminiService.js";
import promptBuilder from "./promptBuilder.js";
import logger from "./logger.js";

class AIService {
  private readonly MAX_PROMPT_LENGTH = 2000;

  async chat(userId: string, guildId: string, prompt: string) {
    try {
      if (prompt.length > this.MAX_PROMPT_LENGTH) {
        return "⚠️ Your message is too long. Please keep it under 2000 characters.";
      }

      const context = await aiContextService.buildPrompt(userId, guildId, prompt);
      const payload = promptBuilder.build(context);
      
      const response = await geminiService.generate(payload);

      await chatHistoryService.add(userId, guildId, "user", prompt);
      await chatHistoryService.add(userId, guildId, "assistant", response);

      return response;
    } catch (error) {
      logger.error(`[AI Service] Chat error for ${userId}:`, error);
      return "⚠️ I'm sorry, I encountered an error while processing your request.";
    }
  }
}

export default new AIService();