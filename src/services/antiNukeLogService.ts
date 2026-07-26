import {
  EmbedBuilder,
  Guild,
} from "discord.js";

import db from "./database.js";
import { PunishmentType } from "@prisma/client";
import { AntiNukeAction } from "../utils/antiNukeActions.js";

class AntiNukeLogService {
  async send(
    guild: Guild,
    executorId: string,
    action: AntiNukeAction,
    punishment: PunishmentType,
  ): Promise<void> {
    const settings =
      await db.guildSettings.findUnique({
        where: {
          guildId: guild.id,
        },
      });

    if (
      !settings?.antiNukeLogChannelId
    ) {
      return;
    }

    const channel =
      await guild.channels.fetch(
        settings.antiNukeLogChannelId,
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return;
    }

    const embed =
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🚨 Anti-Nuke Triggered")
        .addFields(
          {
            name: "Executor",
            value: `<@${executorId}>`,
          },
          {
            name: "Action",
            value: action,
          },
          {
            name: "Punishment",
            value: punishment,
          },
        )
        .setTimestamp();

    await channel.send({
      embeds: [embed],
    });
  }
}

export default new AntiNukeLogService();