import {
  Events,
  GuildChannel,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

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