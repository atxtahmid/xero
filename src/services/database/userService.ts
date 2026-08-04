import db from "../../database/prisma.js";

class UserService {
  async getOrCreate(discordId: string, username?: string) {
    const normalizedUsername = username?.trim();

    return db.user.upsert({
      where: {
        id: discordId,
      },
      update: normalizedUsername
        ? {
            username: normalizedUsername,
          }
        : {},
      create: {
        id: discordId,
        username: normalizedUsername,
      },
    });
  }

  async updateUsername(discordId: string, username: string) {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      throw new Error("Username cannot be empty.");
    }

    const existing = await db.user.findUnique({
      where: {
        id: discordId,
      },
      select: {
        username: true,
      },
    });

    if (existing?.username === normalizedUsername) {
      return existing;
    }

    return db.user.upsert({
      where: {
        id: discordId,
      },
      update: {
        username: normalizedUsername,
      },
      create: {
        id: discordId,
        username: normalizedUsername,
      },
    });
  }

  async find(discordId: string) {
    return db.user.findUnique({
      where: {
        id: discordId,
      },
    });
  }

  async exists(discordId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: {
        id: discordId,
      },
      select: {
        id: true,
      },
    });

    return user !== null;
  }
}

export default new UserService();