import {
  Events,
  Role,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildRoleUpdate,

  async execute(
    oldRole: Role,
    newRole: Role,
  ): Promise<void> {
    await antiNukeHelper.handle(
      newRole.guild,
      AntiNukeAction.ROLE_UPDATE,
    );

    await serverLogService.logRoleUpdate(newRole.guild, oldRole, newRole);
  },
};