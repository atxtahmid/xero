import aiContextService from "./aiContextService.js";
import chatHistoryService from "./chatHistoryService.js";
import geminiService from "./geminiService.js";
import promptBuilder from "./promptBuilder.js";
import logger from "./logger.js";

class AIService {
  private readonly MAX_PROMPT_LENGTH = 2000;

  async chat(
    userId: string,
    guildId: string,
    rawPrompt: string,
  ): Promise<string> {
    try {
      const prompt = rawPrompt.trim();

      if (!prompt) {
        return "⚠️ Please enter a message to chat with Xero.";
      }

      if (prompt.length > this.MAX_PROMPT_LENGTH) {
        return `⚠️ Your message is too long (${prompt.length}/${this.MAX_PROMPT_LENGTH} characters).`;
      }

      const context = await aiContextService.buildPrompt(
        userId,
        guildId,
        prompt,
      );

      const payload = promptBuilder.build(context);

      const response = await geminiService.generate(payload);

      await chatHistoryService.add(userId, guildId, "user", prompt);
      await chatHistoryService.add(userId, guildId, "assistant", response);

      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(
          `[AI Service] Failure for User: ${userId} | Guild: ${guildId}`,
          {
            message: error.message,
            stack: error.stack,
          },
        );
      } else {
        logger.error(
          `[AI Service] Failure for User: ${userId} | Guild: ${guildId}`,
          error,
        );
      }

      return "⚠️ I encountered an error processing that request. Please try again in a few seconds.";
    }
  }
}

export default new AIService();