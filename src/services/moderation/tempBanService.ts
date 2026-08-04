import db from "../../database/prisma.js";
import guildService from "../database/guildService.js";
import { TempBan } from "@prisma/client";

class TempBanService {
  /**
   * Registers a temp ban to be auto-lifted later. Upserts on
   * [guildId, userId] — re-tempbanning someone already tracked just
   * updates their existing entry (new expiry, new reason) instead of
   * creating a duplicate.
   */
  async create(
    guildId: string,
    userId: string,
    moderatorId: string,
    reason: string,
    expiresAt: Date,
  ): Promise<TempBan> {
    await guildService.getOrCreate(guildId);

    return db.tempBan.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      update: {
        moderatorId,
        reason,
        expiresAt,
      },
      create: {
        guildId,
        userId,
        moderatorId,
        reason,
        expiresAt,
      },
    });
  }

  /**
   * Stops tracking a temp ban — called both by the scheduler after
   * lifting an expired one, and by /unban when someone is manually
   * unbanned early, so the tracking row doesn't linger.
   */
  async remove(guildId: string, userId: string): Promise<void> {
    await db.tempBan.deleteMany({
      where: {
        guildId,
        userId,
      },
    });
  }

  async find(
    guildId: string,
    userId: string,
  ): Promise<TempBan | null> {
    return db.tempBan.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });
  }

  async findExpired(): Promise<TempBan[]> {
    return db.tempBan.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
  }
}

export default new TempBanService();
