import {
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

export async function fetchMember(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<GuildMember | null> {
  if (!interaction.guild) {
    return null;
  }

  try {
    return await interaction.guild.members.fetch(
      userId,
    );
  } catch {
    return null;
  }
}

export function canModerate(
  interaction: ChatInputCommandInteraction,
  target: GuildMember,
): {
  success: boolean;
  message?: string;
} {
  if (!interaction.guild) {
    return {
      success: false,
      message:
        "❌ This command can only be used in a server.",
    };
  }

  if (
    target.id === interaction.user.id
  ) {
    return {
      success: false,
      message:
        "❌ You can't moderate yourself.",
    };
  }

  if (
    target.id === interaction.guild.ownerId
  ) {
    return {
      success: false,
      message:
        "❌ You can't moderate the server owner.",
    };
  }

  const moderator =
    interaction.member as GuildMember;

  if (
    moderator.id !== interaction.guild.ownerId &&
    moderator.roles.highest.position <=
      target.roles.highest.position
  ) {
    return {
      success: false,
      message:
        "❌ That member has an equal or higher role than you.",
    };
  }

  const bot =
    interaction.guild.members.me;

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