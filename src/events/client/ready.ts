import { Client, Events } from "discord.js";

import config from "../../config/index.js";
import logger from "../../services/logger.js";
import backupScheduler from "../../services/backupScheduler.js";
import type { Event } from "../../types/Event.js";

const event: Event<typeof Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(client: Client<true>) {
    logger.info(
      `Logged in as ${client.user.tag}`,
    );

    logger.info(
      `Serving ${client.guilds.cache.size} guild(s).`,
    );

    backupScheduler.start(client);

    logger.info(
      "Recovery backup scheduler started.",
    );

    logger.info(
      `Xero v${config.app.version} is now online.`,
    );
  },
};

export default event;