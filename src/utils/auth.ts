import { ChatInputCommandInteraction } from "discord.js";

import antiNukeCoOwnerService from "../services/antiNukeCoOwnerService.js";
import { isGlobalOwner } from "./globalOwner.js";

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

  if (userId === guild.ownerId) {
    return true;
  }

  return await antiNukeCoOwnerService.isCoOwner(
    guild.id,
    userId,
  );
}