import {
  Events,
  GuildChannel,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

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
  },
};