import {
  AuditLogEvent,
  Guild,
} from "discord.js";

import db from "../services/database.js";
import auditLogService from "../services/auditLogService.js";
import thresholdTracker from "./thresholdTracker.js";

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

    // Ignore bot
    if (executor.id === guild.client.user.id) {
      return;
    }

    // Ignore owner
    if (executor.id === guild.ownerId) {
      return;
    }

    const settings =
      await db.antiNukeSettings.findUnique({
        where: {
          guildId: guild.id,
        },
      });

    if (
      !settings ||
      !settings.enabled
    ) {
      return;
    }

    const exceeded =
      thresholdTracker.register(
        guild.id,
        executor.id,
        action.toString(),
        settings.threshold,
        10_000,
      );

    if (!exceeded) {
      console.log(
        `[ANTI-NUKE] ${executor.tag} (${executor.id}) ${action} (${settings.threshold})`,
      );
      return;
    }

    console.log(
      `[ANTI-NUKE] Threshold reached by ${executor.tag}`,
    );

    thresholdTracker.clear(
      guild.id,
      executor.id,
      action.toString(),
    );

    // Punishment comes next.
  }
}

export default new AntiNukeHelper();