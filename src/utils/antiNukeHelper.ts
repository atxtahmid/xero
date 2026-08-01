import { AntiNukeSettings } from "@prisma/client";
import { Guild } from "discord.js";

import config from "../config/index.js";
import antiNukeLogService from "../services/antiNukeLogService.js";
import antiNukeWhitelistService from "../services/antiNukeWhitelistService.js";
import auditLogService from "../services/auditLogService.js";
import db from "../services/database.js";
import logger from "../services/logger.js";
import punishmentService from "../services/punishmentService.js";
import restoreService from "../services/restoreService.js";

import { AntiNukeAction } from "./antiNukeActions.js";
import thresholdTracker from "./thresholdTracker.js";

const AUDIT_LOG_DELAY = 1_500;
const THRESHOLD_WINDOW = 10_000;
const RESTORE_LOCK_DURATION = 30_000;

let isRestoring = false;

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
      executor.id === guild.ownerId ||
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

    if (!isRestoring) {
      isRestoring = true;

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
      } finally {
        setTimeout(() => {
          isRestoring = false;
        }, RESTORE_LOCK_DURATION);
      }
    }

    await antiNukeLogService.send(
      guild,
      executor.id,
      action,
      settings.punishment,
    );

    return true;
  }
}

export default new AntiNukeHelper();