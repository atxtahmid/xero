import db from "../../database/prisma.js";

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

  async setDjRole(guildId: string, roleId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { djRoleId: roleId },
    });
  }

  async setMusicDefaultVolume(guildId: string, volume: number) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { musicDefaultVolume: volume },
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

  async setAiLogChannel(guildId: string, channelId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { aiLogChannelId: channelId },
    });
  }

  async setWelcomeChannel(guildId: string, channelId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { welcomeChannelId: channelId },
    });
  }

  async setWelcomeMessage(guildId: string, message: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { welcomeMessage: message },
    });
  }

  async setLeaveMessage(guildId: string, message: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { leaveMessage: message },
    });
  }

  async setAutoRole(guildId: string, roleId: string | null) {
    await this.ensureGuildSetup(guildId);

    return db.guildSettings.update({
      where: { guildId },
      data: { autoRoleId: roleId },
    });
  }
}

export default new GuildSettingsService();
