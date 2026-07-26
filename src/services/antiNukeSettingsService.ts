import db from "./database.js";

class AntiNukeSettingsService {
  async enable(guildId: string) {
    return db.antiNukeSettings.upsert({
      where: {
        guildId,
      },
      update: {
        enabled: true,
      },
      create: {
        guildId,
        enabled: true,
      },
    });
  }

  async disable(guildId: string) {
    return db.antiNukeSettings.upsert({
      where: {
        guildId,
      },
      update: {
        enabled: false,
      },
      create: {
        guildId,
        enabled: false,
      },
    });
  }

  async get(guildId: string) {
    return db.antiNukeSettings.findUnique({
      where: {
        guildId,
      },
    });
  }
}

export default new AntiNukeSettingsService();