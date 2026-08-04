import { Client } from "discord.js";

import logger from "../../logger/logger.js";
import tempBanService from "./tempBanService.js";

const CHECK_INTERVAL = 60_000;

class TempBanScheduler {
  start(client: Client): void {
    setInterval(() => {
      void this.checkAll(client);
    }, CHECK_INTERVAL);

    logger.info("[TempBan Scheduler] Started.");
  }

  private async checkAll(client: Client): Promise<void> {
    try {
      const expired = await tempBanService.findExpired();

      for (const tempBan of expired) {
        const guild = client.guilds.cache.get(tempBan.guildId);

        if (!guild) {
          // Bot isn't in this guild anymore — nothing to act on, and no
          // point retrying forever. Drop the tracking row.
          await tempBanService.remove(
            tempBan.guildId,
            tempBan.userId,
          );
          continue;
        }

        try {
          await guild.bans.remove(
            tempBan.userId,
            "Temporary ban expired.",
          );

          logger.info(
            `[TempBan] Auto-unbanned ${tempBan.userId} in guild ${tempBan.guildId} (expired).`,
          );
        } catch (error) {
          // Most likely already unbanned manually (Discord treats that
          // as "Unknown Ban", not a real failure) — log it, but the row
          // still gets cleared below either way so this doesn't retry
          // forever.
          logger.warn(
            `[TempBan] Failed to auto-unban ${tempBan.userId} in guild ${tempBan.guildId}:`,
            error,
          );
        } finally {
          await tempBanService.remove(
            tempBan.guildId,
            tempBan.userId,
          );
        }
      }
    } catch (error) {
      logger.error("[TempBan Scheduler] Check failed:", error);
    }
  }
}

export default new TempBanScheduler();
