import {
  ChannelType,
  Guild,
  OverwriteType,
  PermissionsBitField,
} from "discord.js";

import backupService from "../backup/backupService.js";
import logger from "../../logger/logger.js";

class RestoreService {
  async restore(guild: Guild): Promise<void> {
    const backup = await backupService.latestBackup(guild.id);

    if (!backup) {
      throw new Error("No backup found.");
    }

    logger.info(`[Restore] Starting restoration for ${guild.name}`);

    const roleMap = new Map<string, string>();
    const categoryMap = new Map<string, string>();

    await this.restoreRoles(guild, backup.roles, roleMap);
    await this.restoreCategories(guild, backup.channels, categoryMap);
    await this.restoreChannels(
      guild,
      backup.channels,
      roleMap,
      categoryMap,
    );

    logger.info(`[Restore] Restoration completed for ${guild.name}`);
  }

  private async restoreRoles(
    guild: Guild,
    roles: any[],
    roleMap: Map<string, string>,
  ): Promise<void> {
    for (const backupRole of roles) {
      let role = guild.roles.cache.find(
        (r) => r.name === backupRole.name && !r.managed,
      );

      if (!role) {
        try {
          role = await guild.roles.create({
            name: backupRole.name,
            color: backupRole.color,
            hoist: backupRole.hoist,
            mentionable: backupRole.mentionable,
            permissions: BigInt(backupRole.permissions),
            reason: "Backup Restore",
          });
        } catch (error) {
          logger.error(
            `[Restore] Failed to create role ${backupRole.name}`,
            error,
          );
          continue;
        }
      }

      roleMap.set(backupRole.roleId, role.id);
    }

    const positions = roles
      .map((r) => {
        const id = roleMap.get(r.roleId);
        if (!id) return null;

        return {
          role: id,
          position: r.position,
        };
      })
      .filter(Boolean) as { role: string; position: number }[];

    await guild.roles.setPositions(positions).catch(() => {});
  }

  private async restoreCategories(
    guild: Guild,
    channels: any[],
    categoryMap: Map<string, string>,
  ): Promise<void> {
    const categories = channels.filter(
      (c) => c.type === ChannelType.GuildCategory,
    );

    for (const backupCategory of categories) {
      let category = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildCategory &&
          c.name === backupCategory.name,
      );

      if (!category) {
        try {
          category = await guild.channels.create({
            name: backupCategory.name,
            type: ChannelType.GuildCategory,
            position: backupCategory.position,
          });
        } catch (error) {
          logger.error(
            `[Restore] Failed to create category ${backupCategory.name}`,
            error,
          );
          continue;
        }
      }

      categoryMap.set(
        backupCategory.channelId,
        category.id,
      );
    }
  }

  private async restoreChannels(
    guild: Guild,
    channels: any[],
    roleMap: Map<string, string>,
    categoryMap: Map<string, string>,
  ): Promise<void> {
    const normalChannels = channels.filter(
      (c) => c.type !== ChannelType.GuildCategory,
    );

    for (const backupChannel of normalChannels) {
      if (
        guild.channels.cache.some(
          (c) =>
            c.type === backupChannel.type &&
            c.name === backupChannel.name,
        )
      ) {
        continue;
      }

      try {
        const created = await guild.channels.create({
          name: backupChannel.name,
          type: backupChannel.type,
          parent: backupChannel.parentId
            ? categoryMap.get(backupChannel.parentId)
            : undefined,
          topic: backupChannel.topic,
          nsfw: backupChannel.nsfw,
          position: backupChannel.position,
        });

        if (backupChannel.overwrites?.length) {
          await created.permissionOverwrites.set(
            backupChannel.overwrites.map((o: any) => ({
              id: roleMap.get(o.targetId) ?? o.targetId,
              type:
                o.type === 0
                  ? OverwriteType.Role
                  : OverwriteType.Member,
              allow: new PermissionsBitField(
                BigInt(o.allow),
              ),
              deny: new PermissionsBitField(
                BigInt(o.deny),
              ),
            })),
          );
        }
      } catch (error) {
        logger.error(
          `[Restore] Failed to create channel ${backupChannel.name}`,
          error,
        );
      }
    }
  }
}

export default new RestoreService();