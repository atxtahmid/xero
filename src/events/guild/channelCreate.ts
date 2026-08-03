import {
  Events,
  GuildChannel,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";
import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.ChannelCreate,

  async execute(
    channel: GuildChannel,
  ): Promise<void> {
    await antiNukeHelper.handle(
      channel.guild,
      AntiNukeAction.CHANNEL_CREATE,
    );

    await serverLogService.logChannelCreate(channel.guild, channel);
  },
};