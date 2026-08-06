import { Client } from "discord.js";

import giveawayService from "./giveawayService.js";
import logger from "../../logger/logger.js";

const CHECK_INTERVAL = 15_000;

class GiveawayScheduler {
  start(client: Client): void {
    setInterval(() => {
      void this.checkAll(client);
    }, CHECK_INTERVAL);

    logger.info("[Giveaway Scheduler] Started.");
  }

  private async checkAll(client: Client): Promise<void> {
    try {
      const expired = await giveawayService.findExpired();

      for (const giveaway of expired) {
        await giveawayService.end(client, giveaway.id).catch((error) => {
          logger.error(
            `[Giveaway Scheduler] Failed to end giveaway ${giveaway.id}:`,
            error,
          );
        });
      }
    } catch (error) {
      logger.error("[Giveaway Scheduler] Check failed:", error);
    }
  }
}

export default new GiveawayScheduler();
