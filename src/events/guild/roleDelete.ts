import {
  Events,
  Role,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildRoleDelete,

  async execute(
    role: Role,
  ): Promise<void> {
    await antiNukeHelper.handle(
      role.guild,
      AntiNukeAction.ROLE_DELETE,
    );

    await serverLogService.logRoleDelete(role.guild, role);
  },
};