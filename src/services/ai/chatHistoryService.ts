import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";

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
          content: content.trim(),
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

      void this.trimConversation(userId, guildId).catch((error: unknown) => {
        if (error instanceof Error) {
          logger.error(`[ChatHistory] Trim failed for ${userId}`, {
            message: error.message,
            stack: error.stack,
          });
        } else {
          logger.error(`[ChatHistory] Trim failed for ${userId}`, error);
        }
      });

      return message;
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`[ChatHistory] Failed to add message for ${userId}`, {
          message: error.message,
          stack: error.stack,
        });
      } else {
        logger.error(`[ChatHistory] Failed to add message for ${userId}`, error);
      }

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
      where: {
        userId,
        guildId,
      },
    });

    if (count <= this.maxMessages) return;

    const overflowCount = count - this.maxMessages;

    const oldestMessages = await db.chatHistory.findMany({
      where: {
        userId,
        guildId,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: overflowCount,
      select: {
        id: true,
      },
    });

    const idsToDelete = oldestMessages.map((message) => message.id);

    if (!idsToDelete.length) return;

    await db.chatHistory.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });
  }
}

export default new ChatHistoryService();