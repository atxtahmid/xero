import {
  Events,
  Role,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

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
  },
};