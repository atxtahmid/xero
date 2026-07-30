import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";

import { isGlobalOwner } from "./globalOwner.js";
import { Permission } from "../types/Command.js";

export async function hasPermission(
  interaction: ChatInputCommandInteraction,
  permissions: Permission[] = [],
): Promise<boolean> {
  // 1. Global owner bypass
  if (isGlobalOwner(interaction.user.id)) return true;

  // 2. Open commands (USER or no permission set)
  if (permissions.length === 0 || permissions.includes(Permission.USER) || permissions.includes(Permission.AI)) {
    return true;
  }

  if (!interaction.guild) return false;

  // 3. Server owner bypass
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const memberPermissions = interaction.memberPermissions;
  if (!memberPermissions) return false;

  // 4. Administrator Efficiency Bypass
  // If they have Admin, they can do everything else.
  if (memberPermissions.has(PermissionFlagsBits.Administrator)) return true;

  // 5. Explicit Permission Mapping
  for (const permission of permissions) {
    switch (permission) {
      case Permission.ADMIN:
      case Permission.ANTINUKE:
      case Permission.CONFIG:
      case Permission.RECOVERY:
        // These categories require Administrator (already checked above, 
        // but kept for logic clarity if bypass is removed).
        if (memberPermissions.has(PermissionFlagsBits.Administrator)) return true;
        break;

      case Permission.MODERATOR:
        if (
          memberPermissions.has(PermissionFlagsBits.ModerateMembers) ||
          memberPermissions.has(PermissionFlagsBits.ManageMessages) ||
          memberPermissions.has(PermissionFlagsBits.KickMembers) ||
          memberPermissions.has(PermissionFlagsBits.BanMembers)
        ) {
          return true;
        }
        break;

      case Permission.SERVER_OWNER:
        // Handled in step 3, but here for completeness
        if (interaction.guild.ownerId === interaction.user.id) return true;
        break;

      default:
        break;
    }
  }

  return false;
}