import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

import { isGlobalOwner } from "./globalOwner.js";
import { Permission } from "../types/Command.js";

export async function hasPermission(
  interaction: ChatInputCommandInteraction,
  permissions: Permission[] = [],
): Promise<boolean> {
  // Global Owner bypass
  if (isGlobalOwner(interaction.user.id)) {
    return true;
  }

  if (permissions.length === 0) {
    return true;
  }

  if (!interaction.guild || !interaction.member) {
    return false;
  }

  const member =
    interaction.member as GuildMember;

  for (const permission of permissions) {
    switch (permission) {
      case Permission.USER:
        return true;

      case Permission.ADMIN:
        if (
          member.permissions.has(
            PermissionFlagsBits.Administrator,
          )
        ) {
          return true;
        }
        break;

      case Permission.MODERATOR:
        if (
          member.permissions.has(
            PermissionFlagsBits.Administrator,
          ) ||
          member.permissions.has(
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