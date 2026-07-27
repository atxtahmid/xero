import {
  Events,
  Guild,
} from "discord.js";

import db from "../services/database.js";
import logger from "../services/logger.js";

const event = {
  name: Events.GuildCreate,

  async execute(guild: Guild) {
    try {
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
        `Registered guild: ${guild.name} (${guild.id})`,
      );
    } catch (error) {
      logger.error(
        "Failed to register guild:",
        error,
      );
    }
  },
};

export default event;