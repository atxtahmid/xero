import {
  AuditLogEvent,
  Events,
  GuildBasedChannel,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";

export default {
  name: Events.ChannelDelete,

  async execute(channel: GuildBasedChannel) {
    await antiNukeHelper.handle(
      channel.guild,
      AuditLogEvent.ChannelDelete,
    );
  },
};