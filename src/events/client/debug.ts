import {
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.Debug> = {
  name: Events.Debug,

  execute(
    message: string,
  ): void {
    if (
      process.env.NODE_ENV !==
      "development"
    ) {
      return;
    }

    logger.info(
      `[Discord Debug] ${message}`,
    );
  },
};

export default event;