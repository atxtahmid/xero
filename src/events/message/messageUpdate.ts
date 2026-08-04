import { Events, type Message, type PartialMessage } from "discord.js";
import logger from "../../logger/logger.js";
import serverLogService from "../../services/logging/serverLogService.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
    if (newMessage.partial) return;
    if (!newMessage.inGuild() || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    try {
      await serverLogService.logMessageEdit(
        newMessage.guild,
        newMessage.channelId,
        newMessage.author,
        oldMessage.content ?? "",
        newMessage.content,
        newMessage.url,
      );
    } catch (error) {
      logger.error("Error processing MessageUpdate event:", error);
    }
  },
};
export default event;