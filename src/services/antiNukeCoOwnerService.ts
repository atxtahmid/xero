import db from "./database.js";

class AntiNukeCoOwnerService {
  private readonly MAX_CO_OWNERS = 10;

  async add(guildId: string, userId: string) {
    const count = await db.antiNukeCoOwner.count({
      where: { guildId },
    });

    if (count >= this.MAX_CO_OWNERS) {
      throw new Error(`Maximum limit of ${this.MAX_CO_OWNERS} Co-Owners reached.`);
    }

    return db.antiNukeCoOwner.upsert({
      where: {
        guildId_userId: { guildId, userId },
      },
      update: {},
      create: { guildId, userId },
    });
  }

  async remove(guildId: string, userId: string) {
    return db.antiNukeCoOwner.deleteMany({
      where: { guildId, userId },
    });
  }

  async getAll(guildId: string) {
    return db.antiNukeCoOwner.findMany({
      where: { guildId },
      orderBy: { createdAt: "asc" },
    });
  }

  async isCoOwner(guildId: string, userId: string) {
    const record = await db.antiNukeCoOwner.findUnique({
      where: {
        guildId_userId: { guildId, userId },
      },
      select: { id: true }, // Optimization
    });

    return record !== null;
  }
}

export default new AntiNukeCoOwnerService();