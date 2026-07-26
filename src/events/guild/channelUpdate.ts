import {
  AuditLogEvent,
  Events,
  GuildBasedChannel,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";

export default {
  name: Events.ChannelUpdate,

  async execute(
    oldChannel: GuildBasedChannel,
    newChannel: GuildBasedChannel,
  ) {
    await antiNukeHelper.handle(
      newChannel.guild,
      AuditLogEvent.ChannelUpdate,
    );
  },
};