import {
  Events,
} from "discord.js";

import logger from "../../logger/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.ShardResume> = {
  name: Events.ShardResume,

  execute(
    replayedEvents: number,
    shardId: number,
  ): void {
    logger.info(
      `Shard ${shardId} resumed (${replayedEvents} replayed events).`,
    );
  },
};

export default event;