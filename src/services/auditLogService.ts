import {
  AuditLogEvent,
  Guild,
  GuildAuditLogsEntry,
} from "discord.js";

class AuditLogService {
  async getExecutor(
    guild: Guild,
    type: AuditLogEvent,
  ): Promise<GuildAuditLogsEntry | null> {
    const logs = await guild.fetchAuditLogs({
      type,
      limit: 1,
    });

    const entry = logs.entries.first();

    if (!entry) {
      return null;
    }

    return entry;
  }
}

export default new AuditLogService();