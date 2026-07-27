import {
  Events,
  Role,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

export default {
  name: Events.GuildRoleCreate,

  async execute(
    role: Role,
  ): Promise<void> {
    await antiNukeHelper.handle(
      role.guild,
      AntiNukeAction.ROLE_CREATE,
    );
  },
};