import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

import { Permission } from "../types/Command.js";
import { isHighlyTrusted } from "./auth.js";
import { isGlobalOwner } from "./globalOwner.js";
import { isTrustedOwner } from "./ownerTrust.js";

/**
 * Checks whether a user has permission to execute a command.
 */
export async function hasPermission(
  interaction: ChatInputCommandInteraction,
  permissions: Permission[] = [],
): Promise<boolean> {
  const guild = interaction.guild;

  // Global owner bypass
  if (isGlobalOwner(interaction.user.id)) {
    return true;
  }

  // Commands available to everyone
  if (
    permissions.length === 0 ||
    permissions.includes(Permission.USER) ||
    permissions.includes(Permission.AI)
  ) {
    return true;
  }

  if (!guild) {
    return false;
  }

  // Server owner bypass — resolved via the Owner Bypass system (see
  // utils/ownerTrust.ts), not raw guild.ownerId. If the global owner has
  // claimed an override because the real owner's account is compromised,
  // this no longer passes for the original owner.
  if (await isTrustedOwner(guild, interaction.user.id)) {
    return true;
  }

  const memberPermissions = interaction.memberPermissions;

  if (!memberPermissions) {
    return false;
  }

  // Administrator bypass
  if (
    memberPermissions.has(
      PermissionFlagsBits.Administrator,
    )
  ) {
    return true;
  }

  for (const permission of permissions) {
    switch (permission) {
      case Permission.MODERATOR:
        if (
          memberPermissions.has(
            PermissionFlagsBits.ModerateMembers,
          ) ||
          memberPermissions.has(
            PermissionFlagsBits.ManageMessages,
          ) ||
          memberPermissions.has(
            PermissionFlagsBits.KickMembers,
          ) ||
          memberPermissions.has(
            PermissionFlagsBits.BanMembers,
          )
        ) {
          return true;
        }
        break;

      case Permission.SERVER_OWNER:
      case Permission.ANTINUKE:
      case Permission.RECOVERY:
        // Guild-security-critical actions (Anti-Nuke config, backups,
        // restores). Beyond the server owner and global owner, already
        // checked above, only a registered Anti-Nuke co-owner may pass.
        // Previously these cases fell through to `default: break`, which
        // meant `hasPermission()` always returned false for co-owners —
        // even though every command using these permission levels does
        // its own `isHighlyTrusted()` check internally, that inner check
        // was unreachable because this outer gate rejected the
        // interaction first.
        if (await isHighlyTrusted(interaction)) {
          return true;
        }
        break;

      case Permission.GLOBAL_OWNER:
        // Already handled by the isGlobalOwner() bypass above.
        // Non-global-owners never qualify for this level.
        break;

      case Permission.ADMIN:
      case Permission.CONFIG:
        // Already covered by the Administrator bypass above. Listed
        // explicitly (instead of relying on `default`) so every
        // Permission enum value is accounted for on purpose, not by
        // accident.
        break;

      default:
        break;
    }
  }

  return false;
}
