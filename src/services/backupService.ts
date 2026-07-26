import {
  ChannelType,
  Guild,
} from "discord.js";

import db from "./database.js";

class BackupService {
  async createBackup(
    guild: Guild,
  ): Promise<void> {
    const backup =
      await db.guildBackup.create({
        data: {
          guildId: guild.id,
        },
      });

    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort(
        (a, b) =>
          a.position -
          b.position,
      );

    for (const role of roles.values()) {
      await db.roleBackup.create({
        data: {
          backupId: backup.id,

          roleId: role.id,
          name: role.name,

          color: role.color,
          permissions:
            role.permissions.bitfield.toString(),

          position: role.position,
          hoist: role.hoist,
          mentionable:
            role.mentionable,
        },
      });
    }

    const channels =
      guild.channels.cache.sort(
        (a, b) =>
          a.rawPosition -
          b.rawPosition,
      );

    for (const channel of channels.values()) {
      const savedChannel =
        await db.channelBackup.create({
          data: {
            backupId: backup.id,

            channelId: channel.id,
            parentId:
              channel.parentId,

            name: channel.name,
            type: channel.type,

            position:
              channel.rawPosition,

            topic:
              channel.type ===
              ChannelType.GuildText
                ? channel.topic
                : null,

            nsfw:
              "nsfw" in channel
                ? channel.nsfw
                : false,
          },
        });

      for (const overwrite of channel.permissionOverwrites.cache.values()) {
        await db.channelPermissionOverwrite.create(
          {
            data: {
              channelId:
                savedChannel.id,

              targetId:
                overwrite.id,

              type:
                overwrite.type,

              allow:
                overwrite.allow.bitfield.toString(),

              deny:
                overwrite.deny.bitfield.toString(),
            },
          },
        );
      }
    }
  }

  async latestBackup(
    guildId: string,
  ) {
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
      });

    const old =
      backups.slice(5);

    for (const backup of old) {
      await db.guildBackup.delete({
        where: {
          id: backup.id,
        },
      });
    }
  }
}

export default new BackupService();