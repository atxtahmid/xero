import db from "./database.js";
import logger from "./logger.js";

class ChatHistoryService {
  private readonly maxMessages = 20;

  async add(
    userId: string,
    guildId: string,
    role: "user" | "assistant",
    content: string,
  ) {
    try {
      const message = await db.chatHistory.create({
        data: {
          role,
          content,
          // Use connectOrCreate to handle user/guild setup only when needed
          user: {
            connectOrCreate: {
              where: { id: userId },
              create: { id: userId },
            },
          },
          guild: {
            connectOrCreate: {
              where: { id: guildId },
              create: { id: guildId },
            },
          },
        },
      });

      // Fire and forget trimming to keep the interaction fast
      void this.trimConversation(userId, guildId).catch((err) => 
        logger.error(`[ChatHistory] Trim failed for ${userId}:`, err)
      );

      return message;
    } catch (error) {
      logger.error(`[ChatHistory] Failed to add message for ${userId}:`, error);
      throw error;
    }
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
    const count = await db.chatHistory.count({
      where: { userId, guildId },
    });

    if (count <= this.maxMessages) return;

    // Fetch only the IDs of the oldest messages to delete
    const overflowCount = count - this.maxMessages;
    const oldestMessages = await db.chatHistory.findMany({
      where: { userId, guildId },
      orderBy: { createdAt: "asc" },
      take: overflowCount,
      select: { id: true },
    });

    const idsToDelete = oldestMessages.map((m) => m.id);

    await db.chatHistory.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });
  }
}

export default new ChatHistoryService();