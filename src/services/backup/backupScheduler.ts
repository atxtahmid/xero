import { Client } from "discord.js";
import backupService from "./backupService.js";
import logger from "../../logger/logger.js";

class BackupScheduler {
  private static readonly BACKUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
  private static readonly GUILD_DELAY = 5000; // 5 seconds

  private interval: NodeJS.Timeout | null = null;
  private running = false;

  async start(client: Client): Promise<void> {
    if (this.interval) return;

    logger.info("Starting automatic guild backup scheduler...");

    await this.runBackupCycle(client);

    this.interval = setInterval(() => {
      void this.runBackupCycle(client);
    }, BackupScheduler.BACKUP_INTERVAL);

    this.interval.unref();

    logger.info("Automatic backups scheduled every 30 minutes (Sequential Processing).");
  }

  /**
   * Processes backups sequentially to avoid API rate limits,
   * database spikes, and overlapping backup cycles.
   */
  private async runBackupCycle(client: Client): Promise<void> {
    if (this.running) {
      logger.warn("[Backup Cycle] Previous cycle still running. Skipping.");
      return;
    }

    this.running = true;
    const started = Date.now();

    try {
      const guilds = [...client.guilds.cache.values()];
      logger.info(`[Backup Cycle] Starting for ${guilds.length} guild(s)...`);

      for (const guild of guilds) {
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, BackupScheduler.GUILD_DELAY),
          );

          await backupService.createBackup(guild);
          await backupService.deleteOldBackups(guild.id);

          logger.info(
            `[Backup Cycle] Success: ${guild.name} (${guild.id})`,
          );
        } catch (error: any) {
          logger.error(
            `[Backup Cycle] Failed for ${guild.name}: ${error?.message ?? "Unknown Error"}`,
          );
        }
      }

      const duration = ((Date.now() - started) / 1000).toFixed(2);

      logger.info(
        `[Backup Cycle] Completed in ${duration}s.`,
      );
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    if (!this.interval) return;

    clearInterval(this.interval);
    this.interval = null;

    logger.info("Backup scheduler stopped.");
  }
}

export default new BackupScheduler();