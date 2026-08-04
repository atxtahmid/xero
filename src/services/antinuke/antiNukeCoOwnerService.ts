import db from "../../database/prisma.js";

class AntiNukeCoOwnerService {
  private static readonly MAX_CO_OWNERS = 10;

  async add(guildId: string, userId: string) {
    return db.$transaction(async (tx) => {
      const existing = await tx.antiNukeCoOwner.findUnique({
        where: {
          guildId_userId: { guildId, userId },
        },
        select: { id: true },
      });

      if (existing) {
        return existing;
      }

      const count = await tx.antiNukeCoOwner.count({
        where: { guildId },
      });

      if (count >= AntiNukeCoOwnerService.MAX_CO_OWNERS) {
        throw new Error(
          `Maximum limit of ${AntiNukeCoOwnerService.MAX_CO_OWNERS} Co-Owners reached.`,
        );
      }

      return tx.antiNukeCoOwner.create({
        data: {
          guildId,
          userId,
        },
      });
    });
  }

  async remove(guildId: string, userId: string) {
    const result = await db.antiNukeCoOwner.deleteMany({
      where: {
        guildId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new Error("User is not a Co-Owner.");
    }

    return result;
  }

  async getAll(guildId: string) {
    return db.antiNukeCoOwner.findMany({
      where: {
        guildId,
      },
      select: {
        guildId: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async isCoOwner(guildId: string, userId: string) {
    const record = await db.antiNukeCoOwner.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    return record !== null;
  }
}

export default new AntiNukeCoOwnerService();