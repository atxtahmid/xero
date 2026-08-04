import {
  ActivityType,
  Events,
  type Client,
} from "discord.js";

import logger from "../../logger/logger.js";
import { initLavalink } from "../../services/music/lavalinkManager.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(
    client: Client<true>,
  ): Promise<void> {
    logger.info(
      `${client.user.tag} is online.`,
    );

    client.user.setPresence({
      status: "online",

      activities: [
        {
          name:
            "/help | Xero",

          type:
            ActivityType.Listening,
        },
      ],
    });

    try {
      await initLavalink(client);
    } catch (error) {
      logger.error("[Lavalink] Failed to initiate manager:", error);
    }
  },
};

export default event;