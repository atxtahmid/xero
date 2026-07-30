import {
  Events,
  GuildBasedChannel,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

export default {
  name: Events.ChannelDelete,

  async execute(
    channel: GuildBasedChannel,
  ): Promise<void> {
    await antiNukeHelper.handle(
      channel.guild,
      AntiNukeAction.CHANNEL_DELETE,
    );
  },
};