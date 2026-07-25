import db from "./database.js";

class UserService {
  async getOrCreate(discordId: string, username?: string) {
    let user = await db.user.findUnique({
      where: {
        id: discordId,
      },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: discordId,
          username,
        },
      });
    }

    return user;
  }

  async updateUsername(discordId: string, username: string) {
    return db.user.update({
      where: {
        id: discordId,
      },
      data: {
        username,
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

  async exists(discordId: string) {
    const user = await this.find(discordId);
    return user !== null;
  }
}

export default new UserService();