import {
  Events,
  GuildTextBasedChannel,
  Message,
  PartialMessage,
  ReadonlyCollection,
} from "discord.js";

import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.MessageBulkDelete,

  async execute(
    messages: ReadonlyCollection<string, Message<true> | PartialMessage<true>>,
    channel: GuildTextBasedChannel,
  ): Promise<void> {
    await serverLogService.logMessageBulkDelete(
      channel.guild,
      channel.id,
      messages.size,
    );
  },
};
