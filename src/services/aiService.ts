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
  }
}

export default new AIService();