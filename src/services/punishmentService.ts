import {
  GuildMember,
  PermissionsBitField,
} from "discord.js";

import { PunishmentType } from "@prisma/client";

class PunishmentService {
  async punish(
    member: GuildMember,
    punishment: PunishmentType,
  ): Promise<void> {
    if (
      member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      return;
    }

    switch (punishment) {
      case PunishmentType.REMOVE_ROLES: {
        const roles = member.roles.cache.filter(
          (role) => role.id !== member.guild.id,
        );

        for (const role of roles.values()) {
          await member.roles.remove(role).catch(() => {});
        }

        break;
      }

      case PunishmentType.TIMEOUT:
        await member.timeout(
          1000 * 60 * 60 * 24 * 7,
          "Anti-Nuke",
        );
        break;

      case PunishmentType.KICK:
        await member.kick("Anti-Nuke");
        break;

      case PunishmentType.BAN:
        await member.ban({
          reason: "Anti-Nuke",
        });
        break;
    }
  }
}

export default new PunishmentService();