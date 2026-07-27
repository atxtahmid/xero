import { PunishmentType } from "@prisma/client";

import db from "./database.js";

class AntiNukeSettingsService {
  private async ensureGuild(
    guildId: string,
  ): Promise<void> {
    await db.guild.upsert({
      where: {
        id: guildId,
      },
      update: {},
      create: {
        id: guildId,
      },
    });
  }

  async enable(guildId: string) {
    await this.ensureGuild(guildId);

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
    await this.ensureGuild(guildId);

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
    field: string,
    value: number,
  ) {
    await this.ensureGuild(guildId);

    return db.antiNukeSettings.upsert({
      where: {
        guildId,
      },
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
    await this.ensureGuild(guildId);

    return db.antiNukeSettings.upsert({
      where: {
        guildId,
      },
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