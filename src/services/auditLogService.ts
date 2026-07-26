import {
  AuditLogEvent,
  Guild,
  User,
  PartialUser,
} from "discord.js";

class AuditLogService {
  async getExecutor(
    guild: Guild,
    action: AuditLogEvent,
  ): Promise<User | PartialUser | null> {
    try {
      const logs = await guild.fetchAuditLogs({
        type: action,
        limit: 1,
      });

      const entry = logs.entries.first();

      if (!entry?.executor) {
        return null;
      }

      const age =
        Date.now() - entry.createdTimestamp;

      if (age > 10_000) {
        return null;
      }

      return entry.executor;
    } catch {
      return null;
    }
  }
}

export default new AuditLogService();