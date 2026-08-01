import db from "./database.js";

class GuildService {
  async getOrCreate(guildId: string) {
    return db.guild.upsert({
      where: {
        id: guildId,
      },
      update: {},
      create: {
        id: guildId,
      },
    });
  }

  async find(guildId: string) {
    return db.guild.findUnique({
      where: {
        id: guildId,
      },
    });
  }

  async updatePrefix(guildId: string, prefix: string) {
    const normalizedPrefix = prefix.trim();

    if (!normalizedPrefix) {
      throw new Error("Prefix cannot be empty.");
    }

    if (normalizedPrefix.length > 10) {
      throw new Error("Prefix cannot be longer than 10 characters.");
    }

    return db.guild.upsert({
      where: {
        id: guildId,
      },
      update: {
        prefix: normalizedPrefix,
      },
      create: {
        id: guildId,
        prefix: normalizedPrefix,
      },
    });
  }
}

export default new GuildService();