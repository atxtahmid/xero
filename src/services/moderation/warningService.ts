import db from "../../database/prisma.js";
import guildService from "../database/guildService.js";
import userService from "../database/userService.js";

class WarningService {
  async create(
    guildId: string,
    userId: string,
    moderatorId: string,
    reason: string,
  ) {
    // Same fix as caseService.createCase() — Warning.userId and
    // Warning.moderatorId are required foreign keys to User, and nothing
    // in the codebase created those rows before this. See the comment in
    // caseService.ts for the full failure scenario this closes.
    await Promise.all([
      guildService.getOrCreate(guildId),
      userService.getOrCreate(userId),
      userService.getOrCreate(moderatorId),
    ]);

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
