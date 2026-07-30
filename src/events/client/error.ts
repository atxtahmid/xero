import {
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.Error> = {
  name: Events.Error,

  execute(
    error: Error,
  ): void {
    logger.error(
      "Discord client error.",
      error,
    );
  },
};

export default event;