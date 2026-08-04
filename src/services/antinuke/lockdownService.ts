import {
  EmbedBuilder,
  Guild,
} from "discord.js";

import antiNukeLogService from "./antiNukeLogService.js";
import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";
import notificationService from "../logging/notificationService.js";

class LockdownService {
  async isActive(guildId: string): Promise<boolean> {
    const record = await db.antiNukeLockdown.findUnique({
      where: {
        guildId,
      },
      select: {
        active: true,
      },
    });

    return record?.active ?? false;
  }

  /**
   * Engages lockdown: strips every role (except the bot's own managed
   * role and @everyone itself) down to @everyone's current permission
   * level, and snapshots the original permissions so they can be
   * restored exactly once lockdown lifts.
   *
   * The real guild owner is NOT specially handled here — Discord always
   * grants the actual owner full permissions regardless of role
   * permission bits, so no code-level exemption is needed or even
   * possible for them.
   *
   * Roles positioned above the bot's own role in the hierarchy can't be
   * edited by the bot at all (a Discord permission-hierarchy rule, not
   * something code can work around) — those are skipped individually and
   * logged, rather than aborting the whole lockdown over one role Discord
   * would reject anyway.
   */
  async engage(guild: Guild, reason: string): Promise<void> {
    if (await this.isActive(guild.id)) {
      // Already locked down — just extend the cooldown instead of
      // re-stripping roles that are already stripped.
      await this.recordAdditionalTrigger(guild.id);
      return;
    }

    const me = guild.members.me;

    if (!me) {
      logger.error(
        `[Lockdown] Bot member not cached in guild ${guild.id}; cannot engage lockdown.`,
      );
      return;
    }

    const botRole = guild.roles.botRoleFor(guild.client.user.id);
    const basePermissions = guild.roles.everyone.permissions;

    const rolePermissions: Record<string, string> = {};

    for (const role of guild.roles.cache.values()) {
      if (role.id === guild.id) continue; // @everyone itself
      if (botRole && role.id === botRole.id) continue; // bot's own role
      if (role.managed) continue; // other integrations (boosts, other bots)

      if (role.position >= me.roles.highest.position) {
        logger.warn(
          `[Lockdown] Skipping role ${role.id} in guild ${guild.id} — positioned above the bot's own role.`,
        );
        continue;
      }

      rolePermissions[role.id] = role.permissions.bitfield.toString();

      try {
        await role.setPermissions(
          basePermissions,
          `Anti-Nuke lockdown: ${reason}`,
        );
      } catch (error) {
        logger.error(
          `[Lockdown] Failed to strip role ${role.id} in guild ${guild.id}:`,
          error,
        );
      }
    }

    await db.antiNukeLockdown.upsert({
      where: {
        guildId: guild.id,
      },
      update: {
        active: true,
        reason,
        rolePermissions,
        triggeredAt: new Date(),
        lastTriggerAt: new Date(),
      },
      create: {
        guildId: guild.id,
        active: true,
        reason,
        rolePermissions,
      },
    });

    logger.info(`[Lockdown] Engaged in guild ${guild.id}: ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(0x992d22)
      .setTitle("🔒 Server Lockdown Engaged")
      .setDescription(
        `All role permissions have been reduced to member-level to contain an active attack.\n**Reason:** ${reason}`,
      )
      .setTimestamp();

    const channelNotified = await antiNukeLogService.sendToChannel(
      guild,
      embed,
    );

    await notificationService.notifyAntiNukeEvent(
      guild,
      embed,
      channelNotified,
    );
  }

  /**
   * Called every time another Anti-Nuke event fires while lockdown is
   * already active — extends the cooldown so the auto-lift scheduler
   * doesn't disengage mid-attack.
   */
  async recordAdditionalTrigger(guildId: string): Promise<void> {
    await db.antiNukeLockdown.updateMany({
      where: {
        guildId,
        active: true,
      },
      data: {
        lastTriggerAt: new Date(),
      },
    });
  }

  async disengage(guild: Guild): Promise<void> {
    const record = await db.antiNukeLockdown.findUnique({
      where: {
        guildId: guild.id,
      },
    });

    if (!record || !record.active) {
      return;
    }

    const rolePermissions = record.rolePermissions as Record<
      string,
      string
    >;

    for (const [roleId, bitfieldStr] of Object.entries(
      rolePermissions,
    )) {
      const role = guild.roles.cache.get(roleId);

      if (!role) continue;

      try {
        await role.setPermissions(
          BigInt(bitfieldStr),
          "Anti-Nuke lockdown lifted",
        );
      } catch (error) {
        logger.error(
          `[Lockdown] Failed to restore role ${roleId} in guild ${guild.id}:`,
          error,
        );
      }
    }

    await db.antiNukeLockdown.update({
      where: {
        guildId: guild.id,
      },
      data: {
        active: false,
        rolePermissions: {},
      },
    });

    logger.info(`[Lockdown] Lifted in guild ${guild.id}`);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🔓 Server Lockdown Lifted")
      .setDescription(
        "No further Anti-Nuke triggers were detected during the cooldown window. Role permissions have been restored.",
      )
      .setTimestamp();

    const channelNotified = await antiNukeLogService.sendToChannel(
      guild,
      embed,
    );

    await notificationService.notifyAntiNukeEvent(
      guild,
      embed,
      channelNotified,
    );
  }
}

export default new LockdownService();