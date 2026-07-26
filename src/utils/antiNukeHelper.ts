import {
  AuditLogEvent,
  Guild,
} from "discord.js";

import db from "../services/database.js";
import auditLogService from "../services/auditLogService.js";
import antiNukeWhitelistService from "../services/antiNukeWhitelistService.js";
import globalOwnerService from "../services/globalOwnerService.js";
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

    // Ignore the bot itself.
    if (executor.id === guild.client.user.id) {
      return;
    }

    // Global Owner bypass.
    if (
      globalOwnerService.isGlobalOwner(
        executor.id,
      )
    ) {
      return;
    }

    // Server Owner bypass.
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

    // Co-Owner bypass.
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
      return;
    }

    // Whitelist bypass.
    const whitelisted =
      await antiNukeWhitelistService.isWhitelisted(
        guild.id,
        executor.id,
        action.toString(),
      );

    if (whitelisted) {
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