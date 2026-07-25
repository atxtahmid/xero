import db from "./database.js";

class ChatHistoryService {
  async add(
    userId: string,
    guildId: string,
    role: string,
    content: string,
  ) {
    return db.chatHistory.create({
      data: {
        userId,
        guildId,
        role,
        content,
      },
    });
  }

  async getConversation(userId: string, guildId: string, limit = 20) {
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

  async clearConversation(userId: string, guildId: string) {
    return db.chatHistory.deleteMany({
      where: {
        userId,
        guildId,
      },
    });
  }
}

export default new ChatHistoryService();