import {
  Events,
  GuildMember,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

export default {
  name: Events.GuildMemberAdd,

  async execute(
    member: GuildMember,
  ): Promise<void> {
    if (!member.user.bot) {
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

      console.log(
        `[ANTI-NUKE] Removed bot ${member.user.tag}`,
      );
    } catch (error) {
      console.error(
        "[ANTI-NUKE] Failed to remove bot:",
        error,
      );
    }
  },
};