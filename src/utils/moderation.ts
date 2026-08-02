import {
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

import { isTrustedOwner } from "./ownerTrust.js";

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
 *
 * Now async: the hierarchy bypass for "the moderator is the owner" needs
 * to resolve through the Owner Bypass system (utils/ownerTrust.ts) rather
 * than trusting raw guild.ownerId, so a compromised owner account loses
 * this bypass the moment the bot's global owner claims an override.
 */
export async function canModerate(
  interaction: ChatInputCommandInteraction,
  target: GuildMember,
): Promise<{
  success: boolean;
  message?: string;
}> {
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

  // This one intentionally stays tied to the REAL Discord owner, not the
  // resolved trusted owner — Discord's API will always reject a kick/ban
  // against the actual owner no matter what this bot thinks, so this is
  // just giving an accurate error message early rather than a generic
  // "action failed" from Discord. It has no security implication either
  // way, since the platform enforces this regardless.
  if (target.id === guild.ownerId) {
    return {
      success: false,
      message:
        "❌ You can't moderate the server owner.",
    };
  }

  const moderatorIsTrustedOwner = await isTrustedOwner(
    guild,
    moderator.id,
  );

  if (
    !moderatorIsTrustedOwner &&
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
