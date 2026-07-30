import { Client } from "discord.js";
import backupService from "./backupService.js";
import logger from "./logger.js";

class BackupScheduler {
  private interval: NodeJS.Timeout | null = null;

  async start(client: Client): Promise<void> {
    if (this.interval) return;

    logger.info("Starting automatic guild backup scheduler...");

    // Run immediately on start, then every 30 minutes
    await this.runBackupCycle(client);
    
    this.interval = setInterval(
      () => void this.runBackupCycle(client),
      1000 * 60 * 30
    );

    logger.info("Automatic backups scheduled every 30 minutes (Sequential Processing).");
  }

  /**
   * Processes backups sequentially to avoid API rate limits and DB spikes.
   */
  private async runBackupCycle(client: Client): Promise<void> {
    const guilds = [...client.guilds.cache.values()];
    logger.info(`[Backup Cycle] Starting for ${guilds.length} guilds...`);

    for (const guild of guilds) {
      try {
        // Small safety delay between guilds
        await new Promise(resolve => setTimeout(resolve, 5000));

        await backupService.createBackup(guild);
        await backupService.deleteOldBackups(guild.id);

        logger.info(`[Backup Cycle] Success: ${guild.name} (${guild.id})`);
      } catch (error: any) {
        logger.error(
          `[Backup Cycle] Failed for ${guild.name}: ${error.message || "Unknown Error"}`
        );
      }
    }

    logger.info("[Backup Cycle] All scheduled backups processed.");
  }

  stop(): void {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
    logger.info("Backup scheduler stopped.");
  }
}

export default new BackupScheduler();