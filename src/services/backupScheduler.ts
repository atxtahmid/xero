import { Client } from "discord.js";

import backupService from "./backupService.js";
import logger from "./logger.js";

class BackupScheduler {
  private interval: NodeJS.Timeout | null =
    null;

  async start(
    client: Client,
  ): Promise<void> {
    if (this.interval) {
      return;
    }

    logger.info(
      "Starting automatic guild backup scheduler...",
    );

    const run = async () => {
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.channels.fetch();
          await guild.roles.fetch();

          await backupService.createBackup(
            guild,
          );

          await backupService.deleteOldBackups(
            guild.id,
          );

          logger.info(
            `Backup completed for ${guild.name}`,
          );
        } catch (error) {
          logger.error(
            `Failed backing up ${guild.name}`,
            error,
          );
        }
      }
    };

    await run();
    
    this.interval = setInterval(
      async () => {
        await run();
      },
      1000 * 60 * 30,
    );

    logger.info(
      "Automatic backups scheduled every 30 minutes.",
    );
  }

  stop(): void {
    if (!this.interval) {
      return;
    }

    clearInterval(
      this.interval,
    );

    this.interval = null;

    logger.info(
      "Backup scheduler stopped.",
    );
  }
}

export default new BackupScheduler();