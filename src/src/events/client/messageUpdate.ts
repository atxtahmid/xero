import {
  Events,
  type Message,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageUpdate> = {
  name: Events.MessageUpdate,

  async execute(
    oldMessage: Message,
    newMessage: Message,
  ): Promise<void> {
    if (
      oldMessage.partial ||
      newMessage.partial ||
      !newMessage.inGuild() ||
      newMessage.author?.bot
    ) {
      return;
    }

    if (
      oldMessage.content ===
      newMessage.content
    ) {
      return;
    }

    try {
      // Reserved for:
      // - Message edit logs
      // - AI memory updates
      // - Moderation checks
    } catch (error) {
      logger.error(
        "MessageUpdate event failed.",
        error,
      );
    }
  },
};

export default event;