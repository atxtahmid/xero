import {
  Events,
  GuildBan,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

export default {
  name: Events.GuildBanAdd,

  async execute(
    ban: GuildBan,
  ): Promise<void> {
    await antiNukeHelper.handle(
      ban.guild,
      AntiNukeAction.MASS_BAN,
    );
  },
};