import db from "./database.js";

class GuildSettingsService {
  private async ensureGuildSetup(guildId: string): Promise<void> {
    await db.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    });

    await db.guildSettings.upsert({
      where: { guildId },
      update: {},
      create: { guildId },
    });
  }

  async get(guildId: string) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.findUniqueOrThrow({
      where: { guildId },
    });
  }

  async setModRole(guildId: string, roleId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { modRoleId: roleId },
    });
  }

  async setAdminRole(guildId: string, roleId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { adminRoleId: roleId },
    });
  }

  async setAiEnabled(guildId: string, enabled: boolean) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { aiEnabled: enabled },
    });
  }

  async setSearchEnabled(guildId: string, enabled: boolean) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { searchEnabled: enabled },
    });
  }

  async setServerLogChannel(guildId: string, channelId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { serverLogChannelId: channelId },
    });
  }
}

export default new GuildSettingsService();
