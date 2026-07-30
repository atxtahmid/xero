import {
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.ShardError> = {
  name: Events.ShardError,

  execute(
    error: Error,
    shardId: number,
  ): void {
    logger.error(
      `Shard ${shardId} encountered an error.`,
      error,
    );
  },
};

export default event;