import {
  Events,
} from "discord.js";

import logger from "../../logger/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.ShardReady> = {
  name: Events.ShardReady,

  execute(
    shardId: number,
  ): void {
    logger.info(
      `Shard ${shardId} is ready.`,
    );
  },
};

export default event;