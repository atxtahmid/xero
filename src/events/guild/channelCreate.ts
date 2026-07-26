import {
  AuditLogEvent,
  Channel,
  Events,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";

export default {
  name: Events.ChannelCreate,

  async execute(channel: Channel) {
    if (!channel.guild) {
      return;
    }

    await antiNukeHelper.handle(
      channel.guild,
      AuditLogEvent.ChannelCreate,
    );
  },
};