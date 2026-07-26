import {
  AuditLogEvent,
  Channel,
  Events,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";

export default {
  name: Events.ChannelUpdate,

  async execute(
    oldChannel: Channel,
    newChannel: Channel,
  ) {
    if (!newChannel.guild) {
      return;
    }

    await antiNukeHelper.handle(
      newChannel.guild,
      AuditLogEvent.ChannelUpdate,
    );
  },
};