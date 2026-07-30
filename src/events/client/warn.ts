import {
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.Warn> = {
  name: Events.Warn,

  execute(
    warning: string,
  ): void {
    logger.warn(
      `Discord Warning: ${warning}`,
    );
  },
};

export default event;