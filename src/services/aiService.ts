import aiContextService from "./aiContextService.js";
import chatHistoryService from "./chatHistoryService.js";
import geminiService from "./geminiService.js";
import promptBuilder from "./promptBuilder.js";
import tavilyService from "./tavilyService.js";
import logger from "./logger.js";

class AIService {
  private readonly MAX_PROMPT_LENGTH = 2000;

  async chat(
    userId: string,
    guildId: string,
    rawPrompt: string,
    searchEnabled = false,
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

      // Search only runs if the guild has it enabled AND the bot process
      // has a Tavily key configured — tavilyService.search() itself is
      // safe to call unconditionally (it no-ops to [] either way), but
      // skipping the call entirely when the guild has it disabled avoids
      // burning a request/latency for nothing.
      const searchResults = searchEnabled
        ? await tavilyService.search(prompt)
        : [];

      const payload = promptBuilder.build(context, searchResults);

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