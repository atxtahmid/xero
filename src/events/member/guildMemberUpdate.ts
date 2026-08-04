import {
  Events,
  GuildMember,
  PartialGuildMember,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildMemberUpdate,

  async execute(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ): Promise<void> {
    if (newMember.user.bot) {
      return;
    }

    if (oldMember.nickname !== newMember.nickname) {
      await serverLogService.logNicknameChange(
        newMember.guild,
        newMember,
        oldMember.nickname,
        newMember.nickname,
      );
    }

    const addedRoles = newMember.roles.cache.filter(
      (role) => !oldMember.roles.cache.has(role.id),
    );
    const removedRoles = oldMember.roles.cache.filter(
      (role) => !newMember.roles.cache.has(role.id),
    );

    if (addedRoles.size > 0 || removedRoles.size > 0) {
      await serverLogService.logRolesChanged(
        newMember.guild,
        newMember,
        [...addedRoles.values()],
        [...removedRoles.values()],
      );
    }

    const oldTimeout = oldMember.communicationDisabledUntil;
    const newTimeout = newMember.communicationDisabledUntil;

    if (oldTimeout?.getTime() !== newTimeout?.getTime()) {
      await serverLogService.logTimeoutChange(
        newMember.guild,
        newMember,
        oldTimeout,
        newTimeout,
      );
    }
  },
};
