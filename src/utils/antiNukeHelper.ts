import { Guild } from "discord.js";

import db from "../services/database.js";
import auditLogService from "../services/auditLogService.js";
import antiNukeWhitelistService from "../services/antiNukeWhitelistService.js";
import punishmentService from "../services/punishmentService.js";
import globalOwnerService from "./globalOwner.js";
import thresholdTracker from "./thresholdTracker.js";
import { AntiNukeAction } from "./antiNukeActions.js";

class AntiNukeHelper {
  private getThreshold(
    settings: any,
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

  async handle(
    guild: Guild,
    action: AntiNukeAction,
  ): Promise<boolean> {
    const executor =
      await auditLogService.getExecutor(
        guild,
        action,
      );

    if (!executor) {
      return false;
    }

    if (executor.id === guild.client.user.id) {
      return false;
    }

    if (
      globalOwnerService.isGlobalOwner(
        executor.id,
      )
    ) {
      return false;
    }

    if (executor.id === guild.ownerId) {
      return false;
    }

    const settings =
      await db.antiNukeSettings.findUnique({
        where: {
          guildId: guild.id,
        },
      });

    if (!settings || !settings.enabled) {
      return false;
    }

    const coOwner =
      await db.antiNukeCoOwner.findUnique({
        where: {
          guildId_userId: {
            guildId: guild.id,
            userId: executor.id,
          },
        },
      });

    if (coOwner) {
      return false;
    }

    const whitelisted =
      await antiNukeWhitelistService.isWhitelisted(
        guild.id,
        executor.id,
        action,
      );

    if (whitelisted) {
      return false;
    }

    const threshold =
      this.getThreshold(
        settings,
        action,
      );

    const exceeded =
      thresholdTracker.register(
        guild.id,
        executor.id,
        action,
        threshold,
        10_000,
      );

    if (!exceeded) {
      console.log(
        `[ANTI-NUKE] ${executor.tag} (${executor.id}) ${action}`,
      );

      return false;
    }

    console.log(
      `[ANTI-NUKE] Threshold reached by ${executor.tag}`,
    );

    thresholdTracker.clear(
      guild.id,
      executor.id,
      action,
    );

    await punishmentService.execute(
      guild,
      executor,
      settings.punishment,
    );

    return true;
  }
}

export default new AntiNukeHelper();