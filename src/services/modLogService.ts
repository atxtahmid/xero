import {
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
  ColorResolvable,
} from "discord.js";

import db from "./database.js";

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
  if (a.includes("ban")) return 0xed4245; // Red
  if (a.includes("kick")) return 0xfaa61a; // Orange
  if (a.includes("timeout")) return 0xfee75c; // Yellow
  if (a.includes("warn")) return 0x5865f2; // Blue
  if (a.includes("unban") || a.includes("removed")) return 0x57f287; // Green
  return 0x95a5a6; // Gray
}

export async function sendModLog(options: ModLogOptions) {
  try {
    const settings = await db.guildSettings.findUnique({
      where: { guildId: options.guild.id },
    });

    if (!settings?.logChannelId) return;

    const channel = await options.guild.channels.fetch(settings.logChannelId).catch(() => null);

    if (!channel || !(channel instanceof TextChannel)) {
      // Optional: Clean up DB if channel is confirmed deleted
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(getActionColor(options.action))
      .setTitle(`Moderation Log | ${options.action}`)
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
        }
      )
      .setDescription(`**Reason:** ${options.reason}`)
      .setTimestamp();

    if (options.duration) {
      embed.addFields({
        name: "⏳ Duration",
        value: options.duration,
        inline: true,
      });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("[ModLog Service] Failed to send log:", error);
  }
}