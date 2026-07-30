import db from "./database.js";

class AntiNukeWhitelistService {
  /**
   * Normalizes category names to ensure consistency.
   */
  private normalize(category: string): string {
    return category.trim().toUpperCase();
  }

  async add(guildId: string, userId: string, category: string) {
    const normalizedCategory = this.normalize(category);
    return db.antiNukeWhitelist.upsert({
      where: {
        guildId_userId_category: {
          guildId,
          userId,
          category: normalizedCategory,
        },
      },
      update: {},
      create: {
        guildId,
        userId,
        category: normalizedCategory,
      },
    });
  }

  async remove(guildId: string, userId: string, category: string) {
    return db.antiNukeWhitelist.deleteMany({
      where: {
        guildId,
        userId,
        category: this.normalize(category),
      },
    });
  }

  async clear(guildId: string, userId: string) {
    return db.antiNukeWhitelist.deleteMany({
      where: {
        guildId,
        userId,
      },
    });
  }

  async isWhitelisted(
    guildId: string,
    userId: string,
    category: string,
  ): Promise<boolean> {
    const normalized = this.normalize(category);
    
    // Check for specific category or the global "ALL" bypass
    const entry = await db.antiNukeWhitelist.findFirst({
      where: {
        guildId,
        userId,
        category: { in: [normalized, "ALL"] },
      },
      select: { id: true } // Efficiency: Only need to know if it exists
    });

    return entry !== null;
  }

  /**
   * Returns a count of all whitelisted entries for pagination logic.
   */
  async count(guildId: string): Promise<number> {
    return db.antiNukeWhitelist.count({ where: { guildId } });
  }

  /**
   * Supports pagination for large servers.
   */
  async list(guildId: string, skip = 0, take = 10) {
    return db.antiNukeWhitelist.findMany({
      where: { guildId },
      orderBy: [
        { userId: "asc" },
        { category: "asc" },
      ],
      skip,
      take,
    });
  }

  async listUser(guildId: string, userId: string) {
    return db.antiNukeWhitelist.findMany({
      where: { guildId, userId },
      orderBy: { category: "asc" },
    });
  }
}

export default new AntiNukeWhitelistService();