import db from "./database.js";

class ChatHistoryService {
  private readonly maxMessages = 20;

  async add(
    userId: string,
    guildId: string,
    role: string,
    content: string,
  ) {
    const message = await db.chatHistory.create({
      data: {
        userId,
        guildId,
        role,
        content,
      },
    });

    await this.trimConversation(userId, guildId);

    return message;
  }

  async getConversation(
    userId: string,
    guildId: string,
    limit = this.maxMessages,
  ) {
    return db.chatHistory.findMany({
      where: {
        userId,
        guildId,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    });
  }

  async clearConversation(
    userId: string,
    guildId: string,
  ) {
    return db.chatHistory.deleteMany({
      where: {
        userId,
        guildId,
      },
    });
  }

  private async trimConversation(
    userId: string,
    guildId: string,
  ): Promise<void> {
    const messages = await db.chatHistory.findMany({
      where: {
        userId,
        guildId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (messages.length <= this.maxMessages) {
      return;
    }

    const excess = messages.slice(
      0,
      messages.length - this.maxMessages,
    );

    await db.chatHistory.deleteMany({
      where: {
        id: {
          in: excess.map(
            (message: { id: string }) => message.id,
          ),
        },
      },
    });
  }
}

export default new ChatHistoryService();