import db from "./database.js";

class AntiNukeWhitelistService {
  async add(
    guildId: string,
    userId: string,
    category: string,
  ) {
    return db.antiNukeWhitelist.upsert({
      where: {
        guildId_userId_category: {
          guildId,
          userId,
          category,
        },
      },
      update: {},
      create: {
        guildId,
        userId,
        category,
      },
    });
  }

  async remove(
    guildId: string,
    userId: string,
    category: string,
  ) {
    return db.antiNukeWhitelist.deleteMany({
      where: {
        guildId,
        userId,
        category,
      },
    });
  }

  async clear(
    guildId: string,
    userId: string,
  ) {
    return db.antiNukeWhitelist.deleteMany({
      where: {
        guildId,
        userId,
      },
    });
  }

  async isWhitelisted(
    guildId: string,
    userId: string,
    category: string,
  ): Promise<boolean> {
    const entry =
      await db.antiNukeWhitelist.findFirst({
        where: {
          guildId,
          userId,
          OR: [
            {
              category,
            },
            {
              category: "ALL",
            },
          ],
        },
      });

    return entry !== null;
  }

  async list(
    guildId: string,
  ) {
    return db.antiNukeWhitelist.findMany({
      where: {
        guildId,
      },
      orderBy: [
        {
          userId: "asc",
        },
        {
          category: "asc",
        },
      ],
    });
  }

  async listUser(
    guildId: string,
    userId: string,
  ) {
    return db.antiNukeWhitelist.findMany({
      where: {
        guildId,
        userId,
      },
      orderBy: {
        category: "asc",
      },
    });
  }
}

export default new AntiNukeWhitelistService();