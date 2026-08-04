import {
  Events,
  GuildBasedChannel,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.ChannelDelete,

  async execute(
    channel: GuildBasedChannel,
  ): Promise<void> {
    await antiNukeHelper.handle(
      channel.guild,
      AntiNukeAction.CHANNEL_DELETE,
    );

    await serverLogService.logChannelDelete(channel.guild, channel);
  },
};