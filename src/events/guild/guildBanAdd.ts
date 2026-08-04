import {
  Events,
  GuildBan,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildBanAdd,

  async execute(
    ban: GuildBan,
  ): Promise<void> {
    await antiNukeHelper.handle(
      ban.guild,
      AntiNukeAction.MASS_BAN,
    );

    await serverLogService.logBanAdd(ban.guild, ban.user, ban.reason ?? null);
  },
};