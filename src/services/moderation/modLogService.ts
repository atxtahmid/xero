import {
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
  ColorResolvable,
  PermissionFlagsBits,
} from "discord.js";

import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";

export interface ModLogOptions {
  guild: Guild;
  moderator: User;
  target: User;
  action: string;
  reason: string;
  caseId: string;
  duration?: string;
}

function getActionColor(action: string): ColorResolvable {
  const a = action.toLowerCase();

  if (a.includes("ban")) return 0xed4245;
  if (a.includes("kick")) return 0xfaa61a;
  if (a.includes("timeout")) return 0xfee75c;
  if (a.includes("warn")) return 0x5865f2;
  if (a.includes("unban") || a.includes("removed")) return 0x57f287;

  return 0x95a5a6;
}

export async function sendModLog(options: ModLogOptions): Promise<void> {
  try {
    const settings = await db.guildSettings.findUnique({
      where: {
        guildId: options.guild.id,
      },
    });

    if (!settings?.logChannelId) return;

    const channel = await options.guild.channels
      .fetch(settings.logChannelId)
      .catch(() => null);

    if (!(channel instanceof TextChannel)) {
      return;
    }

    const me = options.guild.members.me;

    if (
      !me ||
      !channel.permissionsFor(me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ])
    ) {
      return;
    }

    const reason =
      options.reason.trim() || "No reason provided.";

    const embed = new EmbedBuilder()
      .setColor(getActionColor(options.action))
      .setTitle(`Moderation Log | ${options.action}`)
      .setThumbnail(options.target.displayAvatarURL())
      .setDescription(`**Reason:** ${reason}`)
      .addFields(
        {
          name: "🆔 Case ID",
          value: `\`${options.caseId}\``,
          inline: true,
        },
        {
          name: "👤 Target",
          value: `${options.target.tag}\n(\`${options.target.id}\`)`,
          inline: true,
        },
        {
          name: "🛡️ Moderator",
          value: `${options.moderator.tag}\n(\`${options.moderator.id}\`)`,
          inline: true,
        },
      )
      .setTimestamp();

    if (options.duration) {
      embed.addFields({
        name: "⏳ Duration",
        value: options.duration,
        inline: true,
      });
    }

    await channel.send({
      embeds: [embed],
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("[ModLog Service] Failed to send log", {
        message: error.message,
        stack: error.stack,
      });
    } else {
      logger.error("[ModLog Service] Failed to send log", error);
    }
  }
}