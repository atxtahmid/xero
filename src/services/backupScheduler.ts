import { Client } from "discord.js";

import backupService from "./backupService.js";

class BackupScheduler {
  private interval: NodeJS.Timeout | null =
    null;

  start(client: Client): void {
    if (this.interval) {
      return;
    }

    const run = async () => {
      for (const guild of client.guilds.cache.values()) {
        try {
          await backupService.createBackup(
            guild,
          );

          await backupService.deleteOldBackups(
            guild.id,
          );

          console.log(
            `[BACKUP] ${guild.name} backed up.`,
          );
        } catch (error) {
          console.error(
            `[BACKUP] Failed for ${guild.name}`,
            error,
          );
        }
      }
    };

    run().catch(console.error);

    this.interval = setInterval(() => {
      run().catch(console.error);
    }, 15 * 60 * 1000);
  }

  stop(): void {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);

    this.interval = null;
  }
}

export default new BackupScheduler();