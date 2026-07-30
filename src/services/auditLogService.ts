import {
  AuditLogEvent,
  Guild,
  GuildAuditLogsEntry,
  PermissionFlagsBits,
  User,
} from "discord.js";

import auditCacheService from "./auditCacheService.js";
import { AntiNukeAction } from "../utils/antiNukeActions.js";
import logger from "./logger.js";

class AuditLogService {
  private readonly actionMap = new Map<AntiNukeAction, AuditLogEvent>([
    [AntiNukeAction.BOT_ADD, AuditLogEvent.BotAdd],
    [AntiNukeAction.MASS_BAN, AuditLogEvent.MemberBanAdd],
    [AntiNukeAction.MASS_KICK, AuditLogEvent.MemberKick],
    [AntiNukeAction.CHANNEL_CREATE, AuditLogEvent.ChannelCreate],
    [AntiNukeAction.CHANNEL_DELETE, AuditLogEvent.ChannelDelete],
    [AntiNukeAction.CHANNEL_UPDATE, AuditLogEvent.ChannelUpdate],
    [AntiNukeAction.ROLE_CREATE, AuditLogEvent.RoleCreate],
    [AntiNukeAction.ROLE_DELETE, AuditLogEvent.RoleDelete],
    [AntiNukeAction.ROLE_UPDATE, AuditLogEvent.RoleUpdate],
    [AntiNukeAction.WEBHOOK_CREATE, AuditLogEvent.WebhookCreate],
    [AntiNukeAction.SERVER_UPDATE, AuditLogEvent.GuildUpdate],
  ]);

  async getExecutor(
    guild: Guild,
    action: AntiNukeAction,
  ): Promise<User | null> {
    // 1. Permission Check
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      logger.error(`[AuditLog] Missing ViewAuditLog permission in guild: ${guild.id}`);
      return null;
    }

    // 2. Cache Check
    const cached = auditCacheService.get(guild.id, action);
    if (cached) return cached;

    const auditType = this.actionMap.get(action);
    if (!auditType) {
      logger.warn(`[AuditLog] No mapping found for action: ${action}`);
      return null;
    }

    try {
      // 3. Fetch logs
      const logs = await guild.fetchAuditLogs({
        type: auditType,
        limit: 1,
      });

      const entry = logs.entries.first() as GuildAuditLogsEntry | undefined;
      if (!entry) return null;

      // 4. Validate entry age (ensure we don't punish for an action from hours ago)
      const now = Date.now();
      if (now - entry.createdTimestamp > 30_000) return null;

      const executor = entry.executor;

      // 5. Logic: Executor might be null if Discord is slow. 
      // Partial check ensures the User object is fully loaded.
      if (!executor || executor.partial) {
        return null;
      }

      auditCacheService.set(guild.id, action, executor);
      return executor;
    } catch (error) {
      logger.error(`[AuditLog] Error fetching logs for guild ${guild.id}:`, error);
      return null;
    }
  }
}

export default new AuditLogService();