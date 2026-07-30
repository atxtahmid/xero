import {
  ChannelType,
  Guild,
} from "discord.js";

import db from "./database.js";
import logger from "./logger.js";

class BackupService {
  async createBackup(
    guild: Guild,
  ): Promise<void> {
    try {
      // 1. Force fetch to ensure we aren't backing up an empty cache
      await guild.roles.fetch();
      await guild.channels.fetch();

      const backup = await db.guildBackup.create({
        data: { guildId: guild.id },
      });

      // 2. Backup Roles
      const roles = guild.roles.cache.filter((r) => r.id !== guild.id);
      for (const role of roles.values()) {
        await db.roleBackup.create({
          data: {
            backupId: backup.id,
            roleId: role.id,
            name: role.name,
            color: role.color,
            // Store permissions as string to handle BigInt safety
            permissions: role.permissions.bitfield.toString(),
            position: role.position,
            hoist: role.hoist,
            mentionable: role.mentionable,
          },
        });
      }

      // 3. Backup Channels
      const channels = guild.channels.cache.values();
      for (const channel of channels) {
        const savedChannel = await db.channelBackup.create({
          data: {
            backupId: backup.id,
            channelId: channel.id,
            parentId: channel.parentId,
            name: channel.name,
            type: channel.type,
            position: (channel as any).rawPosition ?? 0,
            topic: channel.type === ChannelType.GuildText ? (channel as any).topic : null,
            nsfw: "nsfw" in channel ? (channel as any).nsfw : false,
          },
        });

        // 4. Backup Permission Overwrites
        if ("permissionOverwrites" in channel) {
          for (const overwrite of channel.permissionOverwrites.cache.values()) {
            await db.channelPermissionOverwrite.create({
              data: {
                channelId: savedChannel.id,
                targetId: overwrite.id,
                type: overwrite.type, // 0 for Role, 1 for Member
                allow: overwrite.allow.bitfield.toString(),
                deny: overwrite.deny.bitfield.toString(),
              },
            });
          }
        }
      }

      logger.info(`[Backup] Successfully created backup ${backup.id} for ${guild.name}`);
    } catch (error) {
      logger.error(`[Backup] Failed to create backup for ${guild.id}:`, error);
      throw error;
    }
  }

  async latestBackup(guildId: string) {
    return db.guildBackup.findFirst({
      where: { guildId },
      include: {
        roles: true,
        channels: {
          include: { overwrites: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteOldBackups(guildId: string): Promise<void> {
    const backups = await db.guildBackup.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (backups.length <= 5) return;

    const toDelete = backups.slice(5).map((b) => b.id);
    await db.guildBackup.deleteMany({
      where: { id: { in: toDelete } },
    });
  }
}

export default new BackupService();