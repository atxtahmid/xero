import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

import { isGlobalOwner } from "./globalOwner.js";
import { Permission } from "../types/Command.js";

export async function hasPermission(
  interaction: ChatInputCommandInteraction,
  permissions: Permission[] = [],
): Promise<boolean> {
  // Global owner bypass
  if (
    isGlobalOwner(
      interaction.user.id,
    )
  ) {
    return true;
  }

  // Commands with no required permission
  if (permissions.length === 0) {
    return true;
  }

  // USER commands are available to everyone
  if (
    permissions.includes(
      Permission.USER,
    )
  ) {
    return true;
  }

  // The remaining permissions require a guild
  if (!interaction.guild) {
    return false;
  }

  // Server owner bypass
  if (
    interaction.guild.ownerId ===
    interaction.user.id
  ) {
    return true;
  }

  const memberPermissions =
    interaction.memberPermissions;

  if (!memberPermissions) {
    return false;
  }

  for (
    const permission of permissions
  ) {
    switch (permission) {
      case Permission.ADMIN:
        if (
          memberPermissions.has(
            PermissionFlagsBits.Administrator,
          )
        ) {
          return true;
        }

        break;

      case Permission.MODERATOR:
        if (
          memberPermissions.has(
            PermissionFlagsBits.Administrator,
          ) ||
          memberPermissions.has(
            PermissionFlagsBits.ModerateMembers,
          )
        ) {
          return true;
        }

        break;

      case Permission.SERVER_OWNER:
        if (
          interaction.guild.ownerId ===
          interaction.user.id
        ) {
          return true;
        }

        break;

      default:
        break;
    }
  }

  return false;
}