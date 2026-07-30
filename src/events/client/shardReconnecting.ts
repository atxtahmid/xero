import {
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.ShardReconnecting> = {
  name: Events.ShardReconnecting,

  execute(
    shardId: number,
  ): void {
    logger.warn(
      `Shard ${shardId} is reconnecting...`,
    );
  },
};

export default event;