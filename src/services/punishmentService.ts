import { GuildMember } from "discord.js";
import { PunishmentType } from "@prisma/client";

import logger from "./logger.js";

class PunishmentService {
  private static readonly REASON =
    "Anti-Nuke: Threshold exceeded.";

  private static readonly TIMEOUT_DURATION =
    7 * 24 * 60 * 60 * 1000;

  async punish(
    member: GuildMember,
    punishment: PunishmentType,
  ): Promise<boolean> {
    const me = member.guild.members.me;

    if (!me) {
      logger.error(
        `[Anti-Nuke] Cannot punish ${member.user.tag}: Bot member unavailable.`,
      );
      return false;
    }

    if (
      !member.manageable ||
      me.roles.highest.position <= member.roles.highest.position
    ) {
      logger.error(
        `[Anti-Nuke] Cannot punish ${member.user.tag}: Higher or equal role hierarchy.`,
      );
      return false;
    }

    try {
      switch (punishment) {
        case PunishmentType.REMOVE_ROLES: {
          const removableRoles = member.roles.cache.filter(
            (role) =>
              role.id !== member.guild.id &&
              !role.managed &&
              role.position < me.roles.highest.position,
          );

          if (removableRoles.size > 0) {
            await member.roles.remove(
              removableRoles,
              PunishmentService.REASON,
            );
          }
          break;
        }

        case PunishmentType.TIMEOUT:
          await member.timeout(
            PunishmentService.TIMEOUT_DURATION,
            PunishmentService.REASON,
          );
          break;

        case PunishmentType.KICK:
          await member.kick(PunishmentService.REASON);
          break;

        case PunishmentType.BAN:
          await member.ban({
            reason: PunishmentService.REASON,
            deleteMessageSeconds: 60 * 60 * 24,
          });
          break;
      }

      logger.info(
        `[Anti-Nuke] Applied ${punishment} to ${member.user.tag} (${member.id})`,
      );

      return true;
    } catch (error) {
      logger.error(
        `[Anti-Nuke] Failed to apply ${punishment} to ${member.id}:`,
        error,
      );

      return false;
    }
  }
}

export default new PunishmentService();