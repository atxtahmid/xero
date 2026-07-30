import { Events, type Guild } from "discord.js";
import db from "../../services/database.js";
import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.GuildCreate> = {
  name: Events.GuildCreate,

  async execute(guild: Guild): Promise<void> {
    try {
      // Initialize Guild and default Settings atomically
      await db.guild.upsert({
        where: { id: guild.id },
        update: {},
        create: {
          id: guild.id,
          settings: {
            create: {
              aiEnabled: true,
              language: "en",
              searchEnabled: true
            }
          }
        },
      });

      logger.info(`Joined guild: ${guild.name} (${guild.id}). Data initialized.`);
    } catch (error) {
      logger.error(`[GuildCreate] Failed to initialize data for ${guild.id}:`, error);
    }
  },
};

export default event;