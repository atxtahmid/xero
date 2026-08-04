import { ChatInputCommandInteraction } from "discord.js";

import antiNukeCoOwnerService from "../services/antinuke/antiNukeCoOwnerService.js";
import { isGlobalOwner } from "./globalOwner.js";
import { isTrustedOwner } from "./ownerTrust.js";

/**
 * Returns whether the user is trusted for Anti-Nuke operations.
 */
export async function isHighlyTrusted(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild) return false;

  const userId = interaction.user.id;

  if (isGlobalOwner(userId)) {
    return true;
  }

  // Uses the resolved trusted owner, not raw guild.ownerId — see
  // utils/ownerTrust.ts. If the global owner has claimed an override
  // because the real owner's account is compromised, the original owner
  // no longer passes this check.
  if (await isTrustedOwner(guild, userId)) {
    return true;
  }

  return await antiNukeCoOwnerService.isCoOwner(
    guild.id,
    userId,
  );
}
