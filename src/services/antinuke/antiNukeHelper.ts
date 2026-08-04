import { AntiNukeSettings } from "@prisma/client";
import { Guild } from "discord.js";

import config from "../../config/index.js";
import antiNukeLogService from "./antiNukeLogService.js";
import antiNukeWhitelistService from "./antiNukeWhitelistService.js";
import auditLogService from "./auditLogService.js";
import db from "../../database/prisma.js";
import lockdownService from "./lockdownService.js";
import logger from "../../logger/logger.js";
import notificationService from "../logging/notificationService.js";
import punishmentService from "../moderation/punishmentService.js";
import restoreService from "../recovery/restoreService.js";

import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import lockdownTracker from "../../managers/lockdownTracker.js";
import { isTrustedOwner } from "../../utils/ownerTrust.js";
import thresholdTracker from "../../managers/thresholdTracker.js";

const AUDIT_LOG_DELAY = 1_500;
const THRESHOLD_WINDOW = 10_000;
const RESTORE_LOCK_DURATION = 30_000;

// Lockdown Trigger A — a coordinated, multi-attacker situation: this many
// DISTINCT executors each individually triggering Anti-Nuke within this
// window is treated as an attack in progress, not isolated incidents.
const LOCKDOWN_DISTINCT_WINDOW = 30_000;
const LOCKDOWN_DISTINCT_THRESHOLD = 3;

// Guilds currently mid-restore. Per-guild — see notes in prior fix history:
// a single shared boolean here previously caused one guild's restore to
// block every other guild's restore for up to 30 seconds.
const restoringGuilds = new Set<string>();

class AntiNukeHelper {
  private getThreshold(
    settings: AntiNukeSettings,
    action: AntiNukeAction,
  ): number {
    switch (action) {
      case AntiNukeAction.BOT_ADD:
        return settings.botAddThreshold;
      case AntiNukeAction.MASS_BAN:
        return settings.massBanThreshold;
      case AntiNukeAction.MASS_KICK:
        return settings.massKickThreshold;
      case AntiNukeAction.CHANNEL_DELETE:
        return settings.channelDeleteThreshold;
      case AntiNukeAction.CHANNEL_CREATE:
        return settings.channelCreateThreshold;
      case AntiNukeAction.CHANNEL_UPDATE:
        return settings.channelUpdateThreshold;
      case AntiNukeAction.ROLE_DELETE:
        return settings.roleDeleteThreshold;
      case AntiNukeAction.ROLE_CREATE:
        return settings.roleCreateThreshold;
      case AntiNukeAction.ROLE_UPDATE:
        return settings.roleUpdateThreshold;
      case AntiNukeAction.WEBHOOK_CREATE:
        return settings.webhookCreateThreshold;
      case AntiNukeAction.SERVER_UPDATE:
        return settings.serverUpdateThreshold;
      default:
        return 1;
    }
  }

  private isEnabled(
    settings: AntiNukeSettings,
    action: AntiNukeAction,
  ): boolean {
    switch (action) {
      case AntiNukeAction.BOT_ADD:
        return settings.antiBotAdd;
      case AntiNukeAction.MASS_BAN:
        return settings.antiMassBan;
      case AntiNukeAction.MASS_KICK:
        return settings.antiMassKick;
      case AntiNukeAction.CHANNEL_DELETE:
        return settings.antiChannelDelete;
      case AntiNukeAction.CHANNEL_CREATE:
        return settings.antiChannelCreate;
      case AntiNukeAction.CHANNEL_UPDATE:
        return settings.antiChannelUpdate;
      case AntiNukeAction.ROLE_DELETE:
        return settings.antiRoleDelete;
      case AntiNukeAction.ROLE_CREATE:
        return settings.antiRoleCreate;
      case AntiNukeAction.ROLE_UPDATE:
        return settings.antiRoleUpdate;
      case AntiNukeAction.WEBHOOK_CREATE:
        return settings.antiWebhookCreate;
      case AntiNukeAction.SERVER_UPDATE:
        return settings.antiServerUpdate;
      default:
        return true;
    }
  }

  async handle(
    guild: Guild,
    action: AntiNukeAction,
  ): Promise<boolean> {
    await new Promise((resolve) =>
      setTimeout(resolve, AUDIT_LOG_DELAY),
    );

    const botId = guild.client.user?.id;

    const executor = await auditLogService.getExecutor(
      guild,
      action,
    );

    if (!executor || executor.id === botId) {
      return false;
    }

    if (
      (await isTrustedOwner(guild, executor.id)) ||
      executor.id === config.owner.id
    ) {
      return false;
    }

    if (
      await antiNukeWhitelistService.isWhitelisted(
        guild.id,
        executor.id,
        action,
      )
    ) {
      return false;
    }

    const settings = await db.antiNukeSettings.findUnique({
      where: {
        guildId: guild.id,
      },
    });

    if (
      !settings ||
      !settings.enabled ||
      !this.isEnabled(settings, action)
    ) {
      return false;
    }

    const coOwner = await db.antiNukeCoOwner.findUnique({
      where: {
        guildId_userId: {
          guildId: guild.id,
          userId: executor.id,
        },
      },
      select: {
        userId: true,
      },
    });

    if (coOwner) {
      return false;
    }

    const threshold = this.getThreshold(
      settings,
      action,
    );

    const exceeded = thresholdTracker.register(
      guild.id,
      executor.id,
      action,
      threshold,
      THRESHOLD_WINDOW,
    );

    if (!exceeded) {
      return false;
    }

    thresholdTracker.clear(
      guild.id,
      executor.id,
      action,
    );

    // Lockdown escalation — evaluated before punishment/restore since
    // containing a live attack takes priority.
    //
    // Trigger B (bot speed): the executor is a bot account. A bot
    // reaching this point already means it crossed a normal Anti-Nuke
    // threshold — for a bot that implies an API-driven attack far faster
    // than any human could act, so it escalates immediately on its own,
    // no need to wait for multiple attackers.
    //
    // Trigger A (coordinated attack): 3+ DISTINCT executors (human or
    // bot) each individually trigger Anti-Nuke within a 30s window. Every
    // executor — bot or human — still feeds this counter even when
    // Trigger B already fired on its own, so a bot mixed in with human
    // attackers still counts toward a coordinated-attack read too.
    const distinctExecutorCount = lockdownTracker.registerAndCount(
      guild.id,
      executor.id,
      LOCKDOWN_DISTINCT_WINDOW,
    );

    let lockdownReason: string | null = null;

    if (executor.bot) {
      lockdownReason = `Bot executor ${executor.tag} triggered Anti-Nuke (${action}).`;
    } else if (
      distinctExecutorCount >= LOCKDOWN_DISTINCT_THRESHOLD
    ) {
      lockdownReason = `${distinctExecutorCount} distinct executors triggered Anti-Nuke within ${
        LOCKDOWN_DISTINCT_WINDOW / 1000
      }s.`;
    }

    if (lockdownReason) {
      await lockdownService
        .engage(guild, lockdownReason)
        .catch((error) =>
          logger.error(
            "[Anti-Nuke] Lockdown engage failed:",
            error,
          ),
        );
    } else if (await lockdownService.isActive(guild.id)) {
      // Already locked down and another trigger just happened —
      // extend the cooldown so the scheduler doesn't lift it mid-attack.
      await lockdownService.recordAdditionalTrigger(guild.id);
    }

    const member = await guild.members
      .fetch(executor.id)
      .catch(() => null);

    if (member) {
      await punishmentService
        .punish(member, settings.punishment)
        .catch((error) =>
          logger.error(
            "[Anti-Nuke] Punishment failed:",
            error,
          ),
        );
    }

    if (!restoringGuilds.has(guild.id)) {
      restoringGuilds.add(guild.id);

      try {
        logger.info(
          `[Anti-Nuke] Starting restoration for guild ${guild.id}`,
        );

        await restoreService.restore(guild);

        logger.info(
          `[Anti-Nuke] Restoration completed for guild ${guild.id}`,
        );
      } catch (error) {
        logger.error(
          `[Anti-Nuke] Restoration failed for guild ${guild.id}:`,
          error,
        );

        // Layer 4 — restore failing means a nuked guild may be left
        // un-repaired. That's critical enough to wake up the bot owner,
        // not just sit in the log file.
        await notificationService.notifySystemFailure(
          guild.client,
          `Anti-Nuke restore failed for guild ${guild.id} (${guild.name})`,
          error,
        );
      } finally {
        setTimeout(() => {
          restoringGuilds.delete(guild.id);
        }, RESTORE_LOCK_DURATION);
      }
    }

    // Layers 2 & 3 — make sure a human actually sees this, not just the
    // log channel (if one even exists).
    const embed = antiNukeLogService.buildEmbed(
      executor.tag,
      executor.id,
      action,
      settings.punishment,
    );

    const channelNotified = await antiNukeLogService.sendToChannel(
      guild,
      embed,
    );

    await notificationService.notifyAntiNukeEvent(
      guild,
      embed,
      channelNotified,
    );

    return true;
  }
}

export default new AntiNukeHelper();
