import {
  Events,
  GuildMember,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";
import logger from "../../services/logger.js";
import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.GuildMemberAdd,

  async execute(
    member: GuildMember,
  ): Promise<void> {
    if (!member.user.bot) {
      await serverLogService.logMemberJoin(member.guild, member);
      return;
    }

    const punished =
      await antiNukeHelper.handle(
        member.guild,
        AntiNukeAction.BOT_ADD,
      );

    if (!punished) {
      return;
    }

    try {
      await member.kick(
        "Anti-Nuke: Unauthorized bot added.",
      );

      logger.info(
        `[ANTI-NUKE] Removed bot ${member.user.tag}`,
      );
    } catch (error) {
      logger.error(
        "[ANTI-NUKE] Failed to remove bot:",
        error,
      );
    }
  },
};