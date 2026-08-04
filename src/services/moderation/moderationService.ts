import {
  ColorResolvable,
  EmbedBuilder,
  Guild,
  GuildMember,
  User,
} from "discord.js";

import logger from "../../logger/logger.js";

export type ModerationAction =
  | "Warn"
  | "Kick"
  | "Ban"
  | "Soft Ban"
  | "Temp Ban"
  | "Timeout"
  | "Timeout Removed";

export interface ModerationDMOptions {
  action: ModerationAction;
  guild: Guild;
  moderator: User;
  member: GuildMember;
  reason: string;
  duration?: string;
  caseId?: string;
  appealUrl?: string;
}

const SUCCESS_COLOR = 0x57f287;
const ERROR_COLOR = 0xed4245;

export async function sendModerationDM(
  options: ModerationDMOptions,
): Promise<boolean> {
  const reason =
    options.reason.trim() || "No reason provided.";

  const safeReason =
    reason.length > 1024
      ? `${reason.slice(0, 1021)}...`
      : reason;

  const embed = new EmbedBuilder()
    .setColor(getColor(options.action))
    .setTitle("Moderation Notice")
    .setThumbnail(options.member.displayAvatarURL())
    .addFields(
      {
        name: "Action",
        value: options.action,
        inline: true,
      },
      {
        name: "Server",
        value: options.guild.name,
        inline: true,
      },
      {
        name: "Moderator",
        value: options.moderator.tag,
      },
      {
        name: "Reason",
        value: safeReason,
      },
    )
    .setTimestamp()
    .setFooter({
      text:
        "If you believe this action was taken in error, please contact the server staff.",
      iconURL:
        options.guild.iconURL() ?? undefined,
    });

  if (options.duration) {
    embed.addFields({
      name: "Duration",
      value: options.duration,
      inline: true,
    });
  }

  if (options.caseId) {
    embed.addFields({
      name: "Case ID",
      value: options.caseId,
      inline: true,
    });
  }

  if (options.appealUrl) {
    embed.addFields({
      name: "Appeal",
      value: options.appealUrl,
    });
  }

  try {
    await options.member.send({
      embeds: [embed],
    });

    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("[Moderation DM] Failed to send DM", {
        userId: options.member.id,
        message: error.message,
        stack: error.stack,
      });
    }

    return false;
  }
}

export function createSuccessEmbed(
  title: string,
  description: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(SUCCESS_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function createErrorEmbed(
  title: string,
  description: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function getColor(
  action: ModerationAction,
): ColorResolvable {
  switch (action) {
    case "Ban":
    case "Soft Ban":
    case "Temp Ban":
      return 0xed4245;

    case "Kick":
      return 0xfaa61a;

    case "Timeout":
      return 0xfee75c;

    case "Timeout Removed":
      return 0x57f287;

    case "Warn":
    default:
      return 0x5865f2;
  }
}