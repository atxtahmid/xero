import db from "./database.js";

class AntiNukeCoOwnerService {
  async add(
    guildId: string,
    userId: string,
  ) {
    return db.antiNukeCoOwner.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      update: {},
      create: {
        guildId,
        userId,
      },
    });
  }

  async remove(
    guildId: string,
    userId: string,
  ) {
    return db.antiNukeCoOwner.deleteMany({
      where: {
        guildId,
        userId,
      },
    });
  }

  async getAll(guildId: string) {
    return db.antiNukeCoOwner.findMany({
      where: {
        guildId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async isCoOwner(
    guildId: string,
    userId: string,
  ) {
    const record =
      await db.antiNukeCoOwner.findUnique({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
      });

    return record !== null;
  }
}

export default new AntiNukeCoOwnerService();