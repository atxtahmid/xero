import {
  ChannelType,
  Guild,
  OverwriteType,
  PermissionsBitField,
} from "discord.js";

import backupService from "./backupService.js";
import logger from "./logger.js";

class RestoreService {
  async restore(guild: Guild): Promise<void> {
    const backup = await backupService.latestBackup(guild.id);
    if (!backup) throw new Error("No backup found.");

    logger.info(`[Restore] Starting restoration for ${guild.name}...`);

    // 1. Roles (Creation first, positioning later)
    await this.restoreRoles(guild, backup.roles);
    
    // 2. Categories (Parents must exist before children)
    await this.restoreCategories(guild, backup.channels);

    // 3. Normal Channels
    await this.restoreChannels(guild, backup.channels);
    
    logger.info(`[Restore] Restoration completed for ${guild.name}`);
  }

  private async restoreRoles(guild: Guild, roles: any[]): Promise<void> {
    const roleMap: { role: any; newId?: string }[] = roles.map(r => ({ role: r }));

    for (const item of roleMap) {
      if (guild.roles.cache.some(r => r.name === item.role.name && r.id !== guild.id)) continue;

      try {
        const created = await guild.roles.create({
          name: item.role.name,
          color: item.role.color,
          hoist: item.role.hoist,
          mentionable: item.role.mentionable,
          permissions: BigInt(item.role.permissions),
          reason: "Anti-Nuke Restoration",
        });
        item.newId = created.id;
        // Small delay to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) { logger.error(`[Restore] Role create failed: ${item.role.name}`, e); }
    }

    // Attempt to set positions (Filtered to only roles the bot can move)
    const positions = roles
      .filter(r => guild.roles.cache.some(gr => gr.name === r.name))
      .map(r => ({
        role: guild.roles.cache.find(gr => gr.name === r.name)!.id,
        position: r.position
      }));
    
    await guild.roles.setPositions(positions).catch(() => {});
  }

  private async restoreCategories(guild: Guild, channels: any[]): Promise<void> {
    const categories = channels.filter(c => c.type === ChannelType.GuildCategory);

    for (const cat of categories) {
      if (guild.channels.cache.some(c => c.name === cat.name && c.type === ChannelType.GuildCategory)) continue;

      await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        position: cat.position,
      }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async restoreChannels(guild: Guild, channels: any[]): Promise<void> {
    const normalChannels = channels.filter(c => c.type !== ChannelType.GuildCategory);

    for (const chan of normalChannels) {
      if (guild.channels.cache.some(c => c.name === chan.name && c.type === chan.type)) continue;

      const parent = chan.parentId 
        ? guild.channels.cache.find(c => c.name === channels.find(bc => bc.channelId === chan.parentId)?.name)
        : null;

      try {
        const created = await guild.channels.create({
          name: chan.name,
          type: chan.type,
          parent: parent?.id,
          topic: chan.topic,
          nsfw: chan.nsfw,
          position: chan.position,
        });

        if (chan.overwrites?.length) {
          await created.permissionOverwrites.set(
            chan.overwrites.map((o: any) => ({
              id: o.targetId,
              type: o.type === 0 ? OverwriteType.Role : OverwriteType.Member,
              allow: new PermissionsBitField(BigInt(o.allow)),
              deny: new PermissionsBitField(BigInt(o.deny)),
            }))
          ).catch(() => {});
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) { logger.error(`[Restore] Channel create failed: ${chan.name}`, e); }
    }
  }
}

export default new RestoreService();