import {
  AuditLogEvent,
  Guild,
  GuildAuditLogsEntry,
  User,
} from "discord.js";

import auditCacheService from "./auditCacheService.js";
import { AntiNukeAction } from "../utils/antiNukeActions.js";

class AuditLogService {
  private readonly actionMap = new Map<
    AntiNukeAction,
    AuditLogEvent
  >([
    [
      AntiNukeAction.BOT_ADD,
      AuditLogEvent.BotAdd,
    ],
    [
      AntiNukeAction.MASS_BAN,
      AuditLogEvent.MemberBanAdd,
    ],
    [
      AntiNukeAction.MASS_KICK,
      AuditLogEvent.MemberKick,
    ],
    [
      AntiNukeAction.CHANNEL_CREATE,
      AuditLogEvent.ChannelCreate,
    ],
    [
      AntiNukeAction.CHANNEL_DELETE,
      AuditLogEvent.ChannelDelete,
    ],
    [
      AntiNukeAction.CHANNEL_UPDATE,
      AuditLogEvent.ChannelUpdate,
    ],
    [
      AntiNukeAction.ROLE_CREATE,
      AuditLogEvent.RoleCreate,
    ],
    [
      AntiNukeAction.ROLE_DELETE,
      AuditLogEvent.RoleDelete,
    ],
    [
      AntiNukeAction.ROLE_UPDATE,
      AuditLogEvent.RoleUpdate,
    ],
    [
      AntiNukeAction.WEBHOOK_CREATE,
      AuditLogEvent.WebhookCreate,
    ],
    [
      AntiNukeAction.SERVER_UPDATE,
      AuditLogEvent.GuildUpdate,
    ],
  ]);

  async getExecutor(
    guild: Guild,
    action: AntiNukeAction,
  ): Promise<User | null> {
    const cached =
      auditCacheService.get(
        guild.id,
        action,
      );

    if (cached) {
      return cached;
    }

    const auditType =
      this.actionMap.get(action);

    if (!auditType) {
      return null;
    }

    const logs =
      await guild.fetchAuditLogs({
        type: auditType,
        limit: 1,
      });

    const entry =
      logs.entries.first() as
        | GuildAuditLogsEntry
        | undefined;

    if (!entry?.executor) {
      return null;
    }

    auditCacheService.set(
      guild.id,
      action,
      entry.executor,
    );

    return entry.executor;
  }
}

export default new AuditLogService();