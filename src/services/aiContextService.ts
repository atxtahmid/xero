import chatHistoryService from "./chatHistoryService.js";

export type ContextMessage = {
  role: string;
  content: string;
};

class AIContextService {
  async buildPrompt(
    userId: string,
    guildId: string,
    prompt: string,
  ): Promise<ContextMessage[]> {
    const history = await chatHistoryService.getConversation(
      userId,
      guildId,
    );

    const messages: ContextMessage[] = history.map(
      (message: { role: string; content: string }) => ({
        role: message.role,
        content: message.content,
      }),
    );

    messages.push({
      role: "user",
      content: prompt,
    });

    return messages;
  }
}

export default new AIContextService();