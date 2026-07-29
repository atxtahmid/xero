import {
  Client,
  Events,
} from "discord.js";

import config from "../../config/index.js";
import logger from "../../services/logger.js";
import backupScheduler from "../../services/backupScheduler.js";
import db from "../../services/database.js";

import type { Event } from "../../types/Event.js";

const event: Event<typeof Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(
    client: Client<true>,
  ) {
    logger.info(
      `Logged in as ${client.user.tag}`,
    );

    logger.info(
      `Bot User ID: ${client.user.id}`,
    );

    await client.application.fetch();

    logger.info(
      `Application ID: ${client.application.id}`,
    );

    logger.info(
      `Configured CLIENT_ID: ${config.discord.clientId}`,
    );

    logger.info(
      `Serving ${client.guilds.cache.size} guild(s).`,
    );

    // Sync every guild into the database
    for (const guild of client.guilds.cache.values()) {
      await db.guild.upsert({
        where: {
          id: guild.id,
        },
        update: {},
        create: {
          id: guild.id,
        },
      });

      logger.info(
        `Registered guild: ${guild.name}`,
      );
    }

    logger.info(
      `Xero v${config.app.version} is now online.`,
    );

    await backupScheduler.start(
      client,
    );
  },
};

export default event;