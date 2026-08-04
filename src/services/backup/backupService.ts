import {
  ChannelType,
  Guild,
} from "discord.js";

import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";

const TRANSACTION_TIMEOUT_MS = 30_000;

class BackupService {
  private readonly MAX_BACKUPS = 5;

  async createBackup(
    guild: Guild,
  ): Promise<void> {
    try {
      await guild.roles.fetch();
      await guild.channels.fetch();

      await db.$transaction(
        async (tx) => {
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

          // Previously this looped and awaited one tx.roleBackup.create()
          // per role, and one tx.channelPermissionOverwrite.create() per
          // overwrite per channel — for any guild with a non-trivial
          // number of roles/channels/overwrites, that easily blew past
          // Prisma's 5s default interactive-transaction timeout. Once
          // the timeout hit, the transaction was already rolled back
          // server-side, but the loop kept trying to use the now-dead
          // transaction handle, throwing P2028 "Transaction not found"
          // on every subsequent call — which is exactly the error
          // that was showing up in the logs, and meant backups were
          // silently failing for any real (non-tiny) server. Batching
          // these into createMany() calls turns dozens/hundreds of
          // sequential round trips into one per table (or one per
          // channel for overwrites, since each needs its parent
          // ChannelBackup's generated id first).
          if (roles.size > 0) {
            await tx.roleBackup.createMany({
              data: roles.map((role) => ({
                backupId: backup.id,
                roleId: role.id,
                name: role.name,
                color: role.color,
                permissions:
                  role.permissions.bitfield.toString(),
                position: role.position,
                hoist: role.hoist,
                mentionable: role.mentionable,
              })),
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
              const overwrites = Array.from(
                channel.permissionOverwrites.cache.values(),
              );

              if (overwrites.length > 0) {
                await tx.channelPermissionOverwrite.createMany({
                  data: overwrites.map((overwrite) => ({
                    channelId: savedChannel.id,
                    targetId: overwrite.id,
                    type: overwrite.type,
                    allow:
                      overwrite.allow.bitfield.toString(),
                    deny:
                      overwrite.deny.bitfield.toString(),
                  })),
                });
              }
            }
          }
        },
        {
          // Safety margin on top of the batching above — a very large
          // guild could still take a while even batched. Prisma's
          // default is 5s, which is what was actually causing this.
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      );

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
