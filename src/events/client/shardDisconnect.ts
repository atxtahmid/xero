import {
  CloseEvent,
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.ShardDisconnect> = {
  name: Events.ShardDisconnect,

  execute(
    eventData: CloseEvent,
    shardId: number,
  ): void {
    logger.warn(
      `Shard ${shardId} disconnected (Code: ${eventData.code}, Reason: ${eventData.reason}).`,
    );
  },
};

export default event;