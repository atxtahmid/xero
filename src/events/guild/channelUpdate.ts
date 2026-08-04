import {
  Events,
  GuildChannel,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.ChannelUpdate,

  async execute(
    oldChannel: GuildChannel,
    newChannel: GuildChannel,
  ): Promise<void> {
    await antiNukeHelper.handle(
      newChannel.guild,
      AntiNukeAction.CHANNEL_UPDATE,
    );

    await serverLogService.logChannelUpdate(
      newChannel.guild,
      oldChannel,
      newChannel,
    );
  },
};