import {
  CategoryChannel,
  ChannelType,
  OverwriteType,
  PermissionsBitField,
  Guild,
} from "discord.js";

import backupService from "./backupService.js";

class RestoreService {
  async restore(
    guild: Guild,
  ): Promise<void> {
    const backup =
      await backupService.latestBackup(
        guild.id,
      );

    if (!backup) {
      throw new Error(
        "No backup found.",
      );
    }

    await this.restoreCategories(
      guild,
      backup.channels,
    );

    await this.restoreRoles(
      guild,
      backup.roles,
    );

    await this.restoreChannels(
      guild,
      backup.channels,
    );
  }

  private async restoreCategories(
    guild: Guild,
    channels: any[],
  ): Promise<void> {
    const categories =
      channels
        .filter(
          (c) =>
            c.type ===
            ChannelType.GuildCategory,
        )
        .sort(
          (a, b) =>
            a.position -
            b.position,
        );

    for (const category of categories) {
      if (
        guild.channels.cache.has(
          category.channelId,
        )
      ) {
        continue;
      }

      await guild.channels.create({
        name: category.name,
        type: ChannelType.GuildCategory,
        position: category.position,
      });
    }
  }

  private async restoreRoles(
    guild: Guild,
    roles: any[],
  ): Promise<void> {
    const sorted =
      [...roles].sort(
        (a, b) =>
          a.position -
          b.position,
      );

    for (const role of sorted) {
      if (
        guild.roles.cache.has(
          role.roleId,
        )
      ) {
        continue;
      }

      await guild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable:
          role.mentionable,
        permissions:
          BigInt(
            role.permissions,
          ),
        position:
          role.position,
      });
    }
  }

  private async restoreChannels(
    guild: Guild,
    channels: any[],
  ): Promise<void> {
    const normalChannels =
      channels
        .filter(
          (c) =>
            c.type !==
            ChannelType.GuildCategory,
        )
        .sort(
          (a, b) =>
            a.position -
            b.position,
        );

    for (const channel of normalChannels) {
      if (
        guild.channels.cache.has(
          channel.channelId,
        )
      ) {
        continue;
      }

      let parent:
        | CategoryChannel
        | null = null;

      if (channel.parentId) {
        const found =
          guild.channels.cache.get(
            channel.parentId,
          );

        if (
          found &&
          found.type ===
            ChannelType.GuildCategory
        ) {
          parent =
            found as CategoryChannel;
        }
      }

      const created =
        await guild.channels.create({
          name: channel.name,
          type:
            channel.type as ChannelType,
          parent,
          position:
            channel.position,
        });

      if (
        created.type ===
          ChannelType.GuildText &&
        channel.topic
      ) {
        await created.setTopic(
          channel.topic,
        );
      }

      if (
        "setNSFW" in created
      ) {
        await (
          created as any
        ).setNSFW(
          channel.nsfw,
        );
      }

      if (
        channel.overwrites
          ?.length
      ) {
        await created.permissionOverwrites.set(
          channel.overwrites.map(
            (
              overwrite: any,
            ) => ({
              id: overwrite.targetId,
              type:
                overwrite.type ===
                0
                  ? OverwriteType.Role
                  : OverwriteType.Member,
              allow:
                new PermissionsBitField(
                  BigInt(
                    overwrite.allow,
                  ),
                ),
              deny:
                new PermissionsBitField(
                  BigInt(
                    overwrite.deny,
                  ),
                ),
            }),
          ),
        );
      }
    }
  }
}

export default new RestoreService();