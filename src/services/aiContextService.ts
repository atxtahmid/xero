import chatHistoryService from "./chatHistoryService.js";

class AIContextService {
  async buildPrompt(
    userId: string,
    guildId: string,
    prompt: string,
  ) {
    const history = await chatHistoryService.getConversation(
      userId,
      guildId,
    );

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    messages.push({
      role: "user",
      content: prompt,
    });

    return messages;
  }
}

export default new AIContextService();