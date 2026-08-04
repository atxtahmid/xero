import { Client } from "discord.js";

import db from "../../database/prisma.js";
import lockdownService from "./lockdownService.js";
import logger from "../../logger/logger.js";

const CHECK_INTERVAL = 30_000;
const LOCKDOWN_COOLDOWN = 5 * 60_000;

class LockdownScheduler {
  start(client: Client): void {
    setInterval(() => {
      void this.checkAll(client);
    }, CHECK_INTERVAL);

    logger.info("[Lockdown Scheduler] Started.");
  }

  private async checkAll(client: Client): Promise<void> {
    try {
      const activeLockdowns = await db.antiNukeLockdown.findMany({
        where: {
          active: true,
        },
      });

      const now = Date.now();

      for (const lockdown of activeLockdowns) {
        if (
          now - lockdown.lastTriggerAt.getTime() <
          LOCKDOWN_COOLDOWN
        ) {
          continue;
        }

        const guild = client.guilds.cache.get(lockdown.guildId);

        if (!guild) continue;

        await lockdownService.disengage(guild).catch((error) => {
          logger.error(
            `[Lockdown Scheduler] Failed to disengage lockdown for guild ${lockdown.guildId}:`,
            error,
          );
        });
      }
    } catch (error) {
      logger.error("[Lockdown Scheduler] Check failed:", error);
    }
  }
}

export default new LockdownScheduler();