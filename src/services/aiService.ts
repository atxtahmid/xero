import aiContextService from "./aiContextService.js";
import chatHistoryService from "./chatHistoryService.js";
import geminiService from "./geminiService.js";
import promptBuilder from "./promptBuilder.js";

class AIService {
  async chat(
    userId: string,
    guildId: string,
    prompt: string,
  ) {
    try {
      const context = await aiContextService.buildPrompt(
        userId,
        guildId,
        prompt,
      );

      const fullPrompt = promptBuilder.build(context);

      const response = await geminiService.generate(fullPrompt);

      await chatHistoryService.add(
        userId,
        guildId,
        "user",
        prompt,
      );

      await chatHistoryService.add(
        userId,
        guildId,
        "assistant",
        response,
      );

      return response;
    } catch (error) {
      console.error(error);

      return "⚠️ Sorry, I'm currently unable to process your request. Please try again in a moment.";
    }
  }
}

export default new AIService();