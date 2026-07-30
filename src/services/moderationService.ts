import {
  ColorResolvable,
  EmbedBuilder,
  Guild,
  GuildMember,
  User,
} from "discord.js";

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

export async function sendModerationDM(
  options: ModerationDMOptions,
): Promise<boolean> {
  const embed =
    new EmbedBuilder()
      .setColor(
        getColor(
          options.action,
        ),
      )
      .setTitle(
        "Moderation Notice",
      )
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
          value:
            options.moderator.tag,
        },
        {
          name: "Reason",
          value: options.reason,
        },
      )
      .setTimestamp()
      .setFooter({
        text:
          "If you believe this action was taken in error, please contact the server staff.",
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
  } catch {
    return false;
  }
}

export function createSuccessEmbed(
  title: string,
  description: string,
) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function createErrorEmbed(
  title: string,
  description: string,
) {
  return new EmbedBuilder()
    .setColor(0xed4245)
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