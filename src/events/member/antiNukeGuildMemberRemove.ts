import {
  Events,
  GuildMember,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildMemberRemove,

  async execute(
    member: GuildMember,
  ): Promise<void> {
    if (member.user.bot) {
      return;
    }

    // Logged immediately, ahead of the Anti-Nuke audit-log delay below —
    // the leave itself is already known and doesn't need to wait on
    // Discord's audit log to be readable.
    await serverLogService.logMemberLeave(member.guild, member);

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