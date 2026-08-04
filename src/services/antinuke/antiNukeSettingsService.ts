import { PunishmentType } from "@prisma/client";
import db from "../../database/prisma.js";

const ALLOWED_THRESHOLD_FIELDS = [
  "botAddThreshold",
  "massBanThreshold",
  "massKickThreshold",
  "channelDeleteThreshold",
  "channelCreateThreshold",
  "channelUpdateThreshold",
  "roleDeleteThreshold",
  "roleCreateThreshold",
  "roleUpdateThreshold",
  "webhookCreateThreshold",
  "serverUpdateThreshold",
] as const;

export type ThresholdField = (typeof ALLOWED_THRESHOLD_FIELDS)[number];

class AntiNukeSettingsService {
  private async ensureGuildSetup(guildId: string): Promise<void> {
    await db.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    });

    await db.guildSettings.upsert({
      where: { guildId },
      update: {},
      create: { guildId },
    });
  }

  async enable(guildId: string) {
    await this.ensureGuildSetup(guildId);

    return db.antiNukeSettings.upsert({
      where: { guildId },
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
    await this.ensureGuildSetup(guildId);

    return db.antiNukeSettings.upsert({
      where: { guildId },
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
      where: { guildId },
      include: {
        guild: {
          select: {
            settings: {
              select: {
                antiNukeLogChannelId: true,
              },
            },
          },
        },
      },
    });
  }

  async setThreshold(
    guildId: string,
    field: ThresholdField,
    value: number,
  ) {
    if (!ALLOWED_THRESHOLD_FIELDS.includes(field)) {
      throw new Error(`Invalid Anti-Nuke field: ${field}`);
    }

    await this.ensureGuildSetup(guildId);

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
    await this.ensureGuildSetup(guildId);

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