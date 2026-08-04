import {
  AuditLogEvent,
  Guild,
  PermissionFlagsBits,
  User,
} from "discord.js";

import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import logger from "../../logger/logger.js";

class AuditLogService {
  private static readonly MAX_AUDIT_LOG_AGE = 30_000;

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

  private readonly inFlight = new Map<string, Promise<User | null>>();

  private makeKey(guildId: string, action: AntiNukeAction): string {
    return `${guildId}:${action}`;
  }

  async getExecutor(
    guild: Guild,
    action: AntiNukeAction,
  ): Promise<User | null> {
    const me = guild.members.me;

    if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      logger.error(
        `[AuditLog] Missing ViewAuditLog permission in guild ${guild.id}`,
      );
      return null;
    }

    const key = this.makeKey(guild.id, action);

    const existing = this.inFlight.get(key);

    if (existing) {
      return existing;
    }

    const fetchPromise = this.fetchExecutor(guild, action).finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, fetchPromise);

    return fetchPromise;
  }

  private async fetchExecutor(
    guild: Guild,
    action: AntiNukeAction,
  ): Promise<User | null> {
    const auditType = this.actionMap.get(action);

    if (!auditType) {
      logger.warn(`[AuditLog] No audit mapping for action: ${action}`);
      return null;
    }

    try {
      const logs = await guild.fetchAuditLogs({
        type: auditType,
        limit: 1,
      });

      const entry = logs.entries.first();

      if (!entry) {
        return null;
      }

      if (
        Date.now() - entry.createdTimestamp >
        AuditLogService.MAX_AUDIT_LOG_AGE
      ) {
        return null;
      }

      const executor = entry.executor;

      if (!executor || executor.partial) {
        return null;
      }

      return executor;
    } catch (error) {
      logger.error(
        `[AuditLog] Failed to fetch audit logs for guild ${guild.id}:`,
        error,
      );

      return null;
    }
  }
}

export default new AuditLogService();
