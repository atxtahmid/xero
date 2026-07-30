import { Guild } from "discord.js";
import { AntiNukeSettings } from "@prisma/client";

import db from "../services/database.js";
import auditLogService from "../services/auditLogService.js";
import antiNukeWhitelistService from "../services/antiNukeWhitelistService.js";
import punishmentService from "../services/punishmentService.js";
import antiNukeLogService from "../services/antiNukeLogService.js";
import restoreService from "../services/restoreService.js";

import config from "../config/index.js";
import thresholdTracker from "./thresholdTracker.js";
import { AntiNukeAction } from "./antiNukeActions.js";

// Static lock to prevent simultaneous restoration tasks
let isRestoring = false;

class AntiNukeHelper {
  private getThreshold(settings: AntiNukeSettings, action: AntiNukeAction): number {
    switch (action) {
      case AntiNukeAction.BOT_ADD: return settings.botAddThreshold;
      case AntiNukeAction.MASS_BAN: return settings.massBanThreshold;
      case AntiNukeAction.MASS_KICK: return settings.massKickThreshold;
      case AntiNukeAction.CHANNEL_DELETE: return settings.channelDeleteThreshold;
      case AntiNukeAction.CHANNEL_CREATE: return settings.channelCreateThreshold;
      case AntiNukeAction.CHANNEL_UPDATE: return settings.channelUpdateThreshold;
      case AntiNukeAction.ROLE_DELETE: return settings.roleDeleteThreshold;
      case AntiNukeAction.ROLE_CREATE: return settings.roleCreateThreshold;
      case AntiNukeAction.ROLE_UPDATE: return settings.roleUpdateThreshold;
      case AntiNukeAction.WEBHOOK_CREATE: return settings.webhookCreateThreshold;
      case AntiNukeAction.SERVER_UPDATE: return settings.serverUpdateThreshold;
      default: return 1;
    }
  }

  private isEnabled(settings: AntiNukeSettings, action: AntiNukeAction): boolean {
    switch (action) {
      case AntiNukeAction.BOT_ADD: return settings.antiBotAdd;
      case AntiNukeAction.MASS_BAN: return settings.antiMassBan;
      case AntiNukeAction.MASS_KICK: return settings.antiMassKick;
      case AntiNukeAction.CHANNEL_DELETE: return settings.antiChannelDelete;
      case AntiNukeAction.CHANNEL_CREATE: return settings.antiChannelCreate;
      case AntiNukeAction.CHANNEL_UPDATE: return settings.antiChannelUpdate;
      case AntiNukeAction.ROLE_DELETE: return settings.antiRoleDelete;
      case AntiNukeAction.ROLE_CREATE: return settings.antiRoleCreate;
      case AntiNukeAction.ROLE_UPDATE: return settings.antiRoleUpdate;
      case AntiNukeAction.WEBHOOK_CREATE: return settings.antiWebhookCreate;
      case AntiNukeAction.SERVER_UPDATE: return settings.antiServerUpdate;
      default: return true;
    }
  }

  async handle(guild: Guild, action: AntiNukeAction): Promise<boolean> {
    // 1. Centralized Audit Log Latency Handling
    // Discord logs are often delayed. Wait 1.5s before fetching.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const executor = await auditLogService.getExecutor(guild, action);
    if (!executor || executor.id === guild.client.user?.id) return false;

    // 2. Early Whitelist & Owner Bypasses (Optimized DB usage)
    if (executor.id === guild.ownerId || executor.id === config.owner.id) return false;

    const whitelisted = await antiNukeWhitelistService.isWhitelisted(guild.id, executor.id, action);
    if (whitelisted) return false;

    const settings = await db.antiNukeSettings.findUnique({ where: { guildId: guild.id } });
    if (!settings || !settings.enabled || !this.isEnabled(settings, action)) return false;

    // Check Co-Owner status
    const coOwner = await db.antiNukeCoOwner.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: executor.id } },
    });
    if (coOwner) return false;

    // 3. Threshold Tracking
    const threshold = this.getThreshold(settings, action);
    const exceeded = thresholdTracker.register(guild.id, executor.id, action, threshold, 10_000);

    if (!exceeded) return false;

    // Threshold exceeded - Clear tracker for this specific action to prevent double trigger
    thresholdTracker.clear(guild.id, executor.id, action);

    // 4. Punishment
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (member) {
      await punishmentService.punish(member, settings.punishment).catch(console.error);
    }

    // 5. Restoring with Anti-Spam Lock
    if (!isRestoring) {
      isRestoring = true;
      try {
        console.log(`[ANTI-NUKE] Triggering restoration for guild ${guild.id}`);
        await restoreService.restore(guild);
      } catch (error) {
        console.error("[ANTI-NUKE] Restoration failed:", error);
      } finally {
        // Unlock after 30 seconds to allow standard backups to proceed normally later
        setTimeout(() => { isRestoring = false; }, 30000);
      }
    }

    await antiNukeLogService.send(guild, executor.id, action, settings.punishment);
    return true;
  }
}

export default new AntiNukeHelper();