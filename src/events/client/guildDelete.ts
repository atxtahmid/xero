import {
  Events,
  type Guild,
} from "discord.js";

import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.GuildDelete> = {
  name: Events.GuildDelete,

  async execute(
    guild: Guild,
  ): Promise<void> {
    try {
      await db.guild.delete({
        where: {
          id: guild.id,
        },
      });
    } catch {
      // Ignore if guild record does not exist.
    }

    logger.info(
      `Left guild: ${guild.name} (${guild.id})`,
    );
  },
};

export default event;