import { ChatInputCommandInteraction } from "discord.js";
import { isGlobalOwner } from "./globalOwner.js";
import antiNukeCoOwnerService from "../services/antiNukeCoOwnerService.js";

/**
 * Checks if a user is the Server Owner, a Global Owner, or an Anti-Nuke Co-Owner.
 */
export async function isHighlyTrusted(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!interaction.guild) return false;

  const userId = interaction.user.id;

  // 1. Global Owner Check
  if (isGlobalOwner(userId)) return true;

  // 2. Server Owner Check
  if (userId === interaction.guild.ownerId) return true;

  // 3. Anti-Nuke Co-Owner Check
  const coOwner = await antiNukeCoOwnerService.isCoOwner(interaction.guild.id, userId);
  if (coOwner) return true;

  return false;
}