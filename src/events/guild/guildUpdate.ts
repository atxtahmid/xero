import {
  Events,
  Guild,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

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