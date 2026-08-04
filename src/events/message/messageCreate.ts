import {
  Events,
  type Message,
} from "discord.js";

import logger from "../../logger/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageCreate> = {
  name: Events.MessageCreate,

  async execute(
    message: Message,
  ): Promise<void> {
    if (
      !message.inGuild() ||
      message.author.bot
    ) {
      return;
    }

    try {
      // Reserved for:
      // - AI chat
      // - Automod
      // - Leveling
      // - Message logging
    } catch (error) {
      logger.error(
        "MessageCreate event failed.",
        error,
      );
    }
  },
};

export default event;