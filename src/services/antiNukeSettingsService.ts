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

  async setThreshold(
    guildId: string,
    threshold: number,
  ) {
    return db.antiNukeSettings.upsert({
      where: {
        guildId,
      },
      update: {
        threshold,
      },
      create: {
        guildId,
        enabled: true,
        threshold,
      },
    });
  }
}

export default new AntiNukeSettingsService();