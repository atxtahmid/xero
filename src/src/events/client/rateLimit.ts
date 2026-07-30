import {
  Events,
  type RateLimitData,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.RateLimit> = {
  name: Events.RateLimit,

  execute(
    rateLimitData: RateLimitData,
  ): void {
    logger.warn(
      [
        "Discord API rate limit hit.",
        `Route: ${rateLimitData.route}`,
        `Method: ${rateLimitData.method}`,
        `Timeout: ${rateLimitData.timeToReset}ms`,
      ].join(" "),
    );
  },
};

export default event;