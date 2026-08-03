import {
  Events,
  Guild,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";
import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.GuildUpdate,

  async execute(
    oldGuild: Guild,
    newGuild: Guild,
  ): Promise<void> {
    await antiNukeHelper.handle(
      newGuild,
      AntiNukeAction.SERVER_UPDATE,
    );

    await serverLogService.logGuildUpdate(newGuild, oldGuild, newGuild);
  },
};