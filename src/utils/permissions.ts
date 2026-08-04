import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

import { Permission } from "../types/Command.js";
import db from "../database/prisma.js";
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

  // Custom mod/admin roles — GuildSettings.adminRoleId / modRoleId,
  // configured via /settings-adminrole and /settings-modrole. These were
  // defined in the schema but never actually read anywhere. Only usable
  // when `interaction.member` is the full cached GuildMember (it can
  // instead be the raw, uncached partial shape, whose `.roles` has no
  // `.cache`) — falls back to the Discord-permission-bit checks below
  // otherwise, same as everything else in this function.
  const member =
    interaction.member instanceof GuildMember
      ? interaction.member
      : null;

  let hasAdminRole = false;
  let hasModRole = false;

  if (member) {
    const settings = await db.guildSettings.findUnique({
      where: { guildId: guild.id },
      select: {
        adminRoleId: true,
        modRoleId: true,
      },
    });

    hasAdminRole =
      !!settings?.adminRoleId &&
      member.roles.cache.has(settings.adminRoleId);

    hasModRole =
      !!settings?.modRoleId &&
      member.roles.cache.has(settings.modRoleId);
  }

  // The configured admin role is a full bypass, same as the real
  // Administrator permission checked just above.
  if (hasAdminRole) {
    return true;
  }

  for (const permission of permissions) {
    switch (permission) {
      case Permission.MODERATOR:
        if (
          hasModRole ||
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
        // Already covered by the Administrator bypass and the custom
        // admin-role bypass above. Listed explicitly (instead of relying
        // on `default`) so every Permission enum value is accounted for
        // on purpose, not by accident.
        break;

      default:
        break;
    }
  }

  return false;
}
