import {
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

/**
 * Fetch a guild member safely.
 */
export async function fetchMember(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<GuildMember | null> {
  const guild = interaction.guild;
  if (!guild) {
    return null;
  }

  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

/**
 * Checks whether the interaction user can moderate the target member.
 */
export function canModerate(
  interaction: ChatInputCommandInteraction,
  target: GuildMember,
): {
  success: boolean;
  message?: string;
} {
  const guild = interaction.guild;

  if (!guild) {
    return {
      success: false,
      message:
        "❌ This command can only be used in a server.",
    };
  }

  const moderator = interaction.member;

  if (!(moderator instanceof GuildMember)) {
    return {
      success: false,
      message:
        "❌ Unable to verify your permissions.",
    };
  }

  const bot = guild.members.me;

  if (target.id === interaction.user.id) {
    return {
      success: false,
      message:
        "❌ You can't moderate yourself.",
    };
  }

  if (target.id === guild.ownerId) {
    return {
      success: false,
      message:
        "❌ You can't moderate the server owner.",
    };
  }

  if (
    moderator.id !== guild.ownerId &&
    moderator.roles.highest.position <=
      target.roles.highest.position
  ) {
    return {
      success: false,
      message:
        "❌ That member has an equal or higher role than you.",
    };
  }

  if (!target.manageable) {
    return {
      success: false,
      message:
        "❌ I can't moderate that member.",
    };
  }

  if (
    bot &&
    bot.roles.highest.position <=
      target.roles.highest.position
  ) {
    return {
      success: false,
      message:
        "❌ That member has an equal or higher role than me.",
    };
  }

  return {
    success: true,
  };
}