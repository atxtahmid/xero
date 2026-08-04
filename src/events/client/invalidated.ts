import {
  Events,
} from "discord.js";

import logger from "../../logger/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.Invalidated> = {
  name: Events.Invalidated,

  execute(): void {
    logger.error(
      "Discord client session has been invalidated. Restart required.",
    );

    process.exit(1);
  },
};

export default event;