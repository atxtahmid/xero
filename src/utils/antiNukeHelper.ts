import {
  AuditLogEvent,
  Guild,
  GuildMember,
} from "discord.js";

import db from "../services/database.js";
import auditLogService from "../services/auditLogService.js";
import punishmentService from "../services/punishmentService.js";

class AntiNukeHelper {
  async handle(
    guild: Guild,
    auditType: AuditLogEvent,
  ): Promise<void> {
    const settings =
      await db.antiNukeSettings.findUnique({
        where: {
          guildId: guild.id,
        },
      });

    if (!settings?.enabled) {
      return;
    }

    const entry = await auditLogService.getExecutor(
      guild,
      auditType,
    );

    if (!entry?.executor) {
      return;
    }

    const member = await guild.members
      .fetch(entry.executor.id)
      .catch(() => null);

    if (!member) {
      return;
    }

    await punishmentService.punish(
      member as GuildMember,
      settings.punishment,
    );
  }
}

export default new AntiNukeHelper();