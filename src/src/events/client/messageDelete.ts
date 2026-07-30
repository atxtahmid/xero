import {
  Events,
  type Message,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageDelete> = {
  name: Events.MessageDelete,

  async execute(
    message: Message,
  ): Promise<void> {
    if (
      message.partial ||
      !message.inGuild()
    ) {
      return;
    }

    try {
      // Reserved for:
      // - Message delete logs
      // - AntiNuke checks
    } catch (error) {
      logger.error(
        "MessageDelete event failed.",
        error,
      );
    }
  },
};

export default event;