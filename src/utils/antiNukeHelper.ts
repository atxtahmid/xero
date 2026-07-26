import {
  AuditLogEvent,
  Guild,
} from "discord.js";

import auditLogService from "../services/auditLogService.js";

class AntiNukeHelper {
  async handle(
    guild: Guild,
    action: AuditLogEvent,
  ): Promise<void> {
    const executor =
      await auditLogService.getExecutor(
        guild,
        action,
      );

    if (!executor) {
      return;
    }

    // Ignore the bot itself
    if (executor.id === guild.client.user.id) {
      return;
    }

    // Ignore the guild owner
    if (executor.id === guild.ownerId) {
      return;
    }

    console.log(
      `[ANTI-NUKE] ${executor.tag} (${executor.id}) performed ${AuditLogEvent[action]}`,
    );

    // Threshold tracking will be added next.
  }
}

export default new AntiNukeHelper();