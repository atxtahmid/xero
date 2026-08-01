import {
  EmbedBuilder,
  Guild,
  TextChannel,
} from "discord.js";

import { PunishmentType } from "@prisma/client";

import db from "./database.js";
import logger from "./logger.js";
import { AntiNukeAction } from "../utils/antiNukeActions.js";

class AntiNukeLogService {
  async send(
    guild: Guild,
    executorId: string,
    action: AntiNukeAction,
    punishment: PunishmentType,
  ): Promise<void> {
    try {
      const settings = await db.guildSettings.findUnique({
        where: {
          guildId: guild.id,
        },
      });

      if (!settings?.antiNukeLogChannelId) {
        return;
      }

      const channel = await guild.channels
        .fetch(settings.antiNukeLogChannelId)
        .catch(() => null);

      if (!(channel instanceof TextChannel)) {
        await db.guildSettings.update({
          where: {
            guildId: guild.id,
          },
          data: {
            antiNukeLogChannelId: null,
          },
        }).catch(() => {});

        return;
      }

      const executor = await guild.client.users
        .fetch(executorId)
        .catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🚨 Anti-Nuke Triggered")
        .setDescription(
          "An unauthorized high-frequency action was detected and neutralized.",
        )
        .addFields(
          {
            name: "🛡️ Executor",
            value: executor
              ? `${executor.tag}\n(\`${executor.id}\`)`
              : `Unknown User\n(\`${executorId}\`)`,
            inline: true,
          },
          {
            name: "⚡ Action",
            value: `\`${action}\``,
            inline: true,
          },
          {
            name: "🔨 Punishment",
            value: `\`${punishment}\``,
            inline: true,
          },
        )
        .setFooter({
          text: "Xero Security Engine",
        })
        .setTimestamp();

      await channel.send({
        embeds: [embed],
      });
    } catch (error) {
      logger.error(
        `[AntiNukeLog] Failed to send log for guild ${guild.id}:`,
        error,
      );
    }
  }
}

export default new AntiNukeLogService();