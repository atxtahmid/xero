import db from "./database.js";

class WarningService {
  async create(
    guildId: string,
    userId: string,
    moderatorId: string,
    reason: string,
  ) {
    return db.warning.create({
      data: {
        guildId,
        userId,
        moderatorId,
        reason,
      },
    });
  }

  async getAll(
    guildId: string,
    userId: string,
  ) {
    return db.warning.findMany({
      where: {
        guildId,
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async count(
    guildId: string,
    userId: string,
  ) {
    return db.warning.count({
      where: {
        guildId,
        userId,
      },
    });
  }

  async delete(
    id: string,
  ) {
    return db.warning.delete({
      where: {
        id,
      },
    });
  }

  async clear(
    guildId: string,
    userId: string,
  ) {
    return db.warning.deleteMany({
      where: {
        guildId,
        userId,
      },
    });
  }
}

export default new WarningService();