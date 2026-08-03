import {
  Events,
  GuildBan,
} from "discord.js";

import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.GuildBanRemove,

  async execute(
    ban: GuildBan,
  ): Promise<void> {
    await serverLogService.logBanRemove(ban.guild, ban.user);
  },
};
