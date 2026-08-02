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
  /**
   * Builds the Anti-Nuke event embed. Split out from `sendToChannel` so
   * the exact same embed can also be handed to `notificationService`
   * for co-owner/owner DMs (Layers 2 & 3) — one source of truth for what
   * the alert actually says.
   */
  buildEmbed(
    executorTag: string,
    executorId: string,
    action: AntiNukeAction,
    punishment: PunishmentType,
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🚨 Anti-Nuke Triggered")
      .setDescription(
        "An unauthorized high-frequency action was detected and neutralized.",
      )
      .addFields(
        {
          name: "🛡️ Executor",
          value: `${executorTag}\n(\`${executorId}\`)`,
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
  }

  /**
   * Posts a prebuilt embed to the configured Anti-Nuke log channel, if
   * one exists. Returns whether it actually reached a channel — callers
   * (see antiNukeHelper.ts / notificationService.ts) use this to decide
   * whether co-owners still need to be notified directly.
   */
  async sendToChannel(
    guild: Guild,
    embed: EmbedBuilder,
  ): Promise<boolean> {
    try {
      const settings = await db.guildSettings.findUnique({
        where: {
          guildId: guild.id,
        },
      });

      if (!settings?.antiNukeLogChannelId) {
        return false;
      }

      const channel = await guild.channels
        .fetch(settings.antiNukeLogChannelId)
        .catch(() => null);

      if (!(channel instanceof TextChannel)) {
        await db.guildSettings
          .update({
            where: {
              guildId: guild.id,
            },
            data: {
              antiNukeLogChannelId: null,
            },
          })
          .catch(() => {});

        return false;
      }

      await channel.send({
        embeds: [embed],
      });

      return true;
    } catch (error) {
      logger.error(
        `[AntiNukeLog] Failed to send log for guild ${guild.id}:`,
        error,
      );

      return false;
    }
  }
}

export default new AntiNukeLogService();
