import db from "./database.js";

class GuildService {
  async getOrCreate(guildId: string) {
    let guild = await db.guild.findUnique({
      where: {
        id: guildId,
      },
    });

    if (!guild) {
      guild = await db.guild.create({
        data: {
          id: guildId,
        },
      });
    }

    return guild;
  }

  async find(guildId: string) {
    return db.guild.findUnique({
      where: {
        id: guildId,
      },
    });
  }

  async updatePrefix(guildId: string, prefix: string) {
    return db.guild.update({
      where: {
        id: guildId,
      },
      data: {
        prefix,
      },
    });
  }
}

export default new GuildService();