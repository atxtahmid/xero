import { PunishmentType } from "@prisma/client";

import db from "./database.js";

class AntiNukeSettingsService {
  async enable(guildId: string) {
    return db.antiNukeSettings.upsert({
      where: { guildId },
      update: { enabled: true },
      create: {
        guildId,
        enabled: true,
      },
    });
  }

  async disable(guildId: string) {
    return db.antiNukeSettings.upsert({
      where: { guildId },
      update: { enabled: false },
      create: {
        guildId,
        enabled: false,
      },
    });
  }

  async get(guildId: string) {
    return db.antiNukeSettings.findUnique({
      where: { guildId },
    });
  }

  async setThreshold(
    guildId: string,
    field: string,
    value: number,
  ) {
    return db.antiNukeSettings.upsert({
      where: { guildId },
      update: {
        [field]: value,
      },
      create: {
        guildId,
        enabled: true,
        [field]: value,
      },
    });
  }

  async setPunishment(
    guildId: string,
    punishment: PunishmentType,
  ) {
    return db.antiNukeSettings.upsert({
      where: { guildId },
      update: {
        punishment,
      },
      create: {
        guildId,
        enabled: true,
        punishment,
      },
    });
  }
}

export default new AntiNukeSettingsService();