import {
  Events,
  GuildMember,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";

export default {
  name: Events.GuildMemberRemove,

  async execute(
    member: GuildMember,
  ): Promise<void> {
    if (member.user.bot) {
      return;
    }

    // Audit-log read delay is handled once, inside
    // antiNukeHelper.handle() (AUDIT_LOG_DELAY) — every other Anti-Nuke
    // event handler relies on that same internal delay rather than
    // adding its own on top.
    await antiNukeHelper.handle(
      member.guild,
      AntiNukeAction.MASS_KICK,
    );
  },
};