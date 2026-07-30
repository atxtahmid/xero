import {
  GuildMember,
  PermissionsBitField,
} from "discord.js";

import { PunishmentType } from "@prisma/client";
import logger from "./logger.js";

class PunishmentService {
  async punish(
    member: GuildMember,
    punishment: PunishmentType,
  ): Promise<void> {
    const me = member.guild.members.me;
    
    // 1. Hierarchy Check: If the bot cannot manage the member, log and abort.
    if (!member.manageable || (me && me.roles.highest.position <= member.roles.highest.position)) {
      logger.error(`[Anti-Nuke] Cannot punish ${member.user.tag}: Higher or equal role hierarchy.`);
      return;
    }

    try {
      switch (punishment) {
        case PunishmentType.REMOVE_ROLES: {
          // Optimized: Single API call to strip all roles except @everyone
          await member.roles.set([], "Anti-Nuke: Mass role removal.");
          break;
        }

        case PunishmentType.TIMEOUT:
          // 7 Day timeout
          await member.timeout(
            7 * 24 * 60 * 60 * 1000,
            "Anti-Nuke: Threshold exceeded."
          );
          break;

        case PunishmentType.KICK:
          await member.kick("Anti-Nuke: Threshold exceeded.");
          break;

        case PunishmentType.BAN:
          await member.ban({
            reason: "Anti-Nuke: Threshold exceeded.",
            deleteMessageSeconds: 60 * 60 * 24, // Delete 1 day of messages
          });
          break;
      }
      logger.info(`[Anti-Nuke] Applied ${punishment} to ${member.user.tag} (${member.id})`);
    } catch (error) {
      logger.error(`[Anti-Nuke] Failed to apply ${punishment} to ${member.id}:`, error);
    }
  }
}

export default new PunishmentService();