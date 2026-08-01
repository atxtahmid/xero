import {
  ChannelType,
  Guild,
} from "discord.js";

import db from "./database.js";
import logger from "./logger.js";

class BackupService {
  private readonly MAX_BACKUPS = 5;

  async createBackup(
    guild: Guild,
  ): Promise<void> {
    try {
      await guild.roles.fetch();
      await guild.channels.fetch();

      await db.$transaction(async (tx) => {
        const backup = await tx.guildBackup.create({
          data: {
            guildId: guild.id,
          },
        });

        const roles = guild.roles.cache.filter(
          (role) =>
            role.id !== guild.id &&
            !role.managed,
        );

        for (const role of roles.values()) {
          await tx.roleBackup.create({
            data: {
              backupId: backup.id,
              roleId: role.id,
              name: role.name,
              color: role.color,
              permissions:
                role.permissions.bitfield.toString(),
              position: role.position,
              hoist: role.hoist,
              mentionable: role.mentionable,
            },
          });
        }

        for (const channel of guild.channels.cache.values()) {
          const savedChannel =
            await tx.channelBackup.create({
              data: {
                backupId: backup.id,
                channelId: channel.id,
                parentId: channel.parentId,
                name: channel.name,
                type: channel.type,
                position:
                  (channel as any).rawPosition ?? 0,
                topic:
                  channel.type ===
                  ChannelType.GuildText
                    ? (channel as any).topic
                    : null,
                nsfw:
                  "nsfw" in channel
                    ? (channel as any).nsfw
                    : false,
              },
            });

          if ("permissionOverwrites" in channel) {
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
              await tx.channelPermissionOverwrite.create({
                data: {
                  channelId: savedChannel.id,
                  targetId: overwrite.id,
                  type: overwrite.type,
                  allow:
                    overwrite.allow.bitfield.toString(),
                  deny:
                    overwrite.deny.bitfield.toString(),
                },
              });
            }
          }
        }
      });

      await this.deleteOldBackups(guild.id);

      logger.info(
        `[Backup] Successfully created backup for ${guild.name} (${guild.id})`,
      );
    } catch (error) {
      logger.error(
        `[Backup] Failed to create backup for ${guild.id}`,
        error,
      );
      throw error;
    }
  }

  async latestBackup(guildId: string) {
    return db.guildBackup.findFirst({
      where: {
        guildId,
      },
      include: {
        roles: true,
        channels: {
          include: {
            overwrites: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async deleteOldBackups(
    guildId: string,
  ): Promise<void> {
    const backups =
      await db.guildBackup.findMany({
        where: {
          guildId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
      });

    if (backups.length <= this.MAX_BACKUPS) {
      return;
    }

    const ids = backups
      .slice(this.MAX_BACKUPS)
      .map((b) => b.id);

    await db.guildBackup.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}

export default new BackupService();