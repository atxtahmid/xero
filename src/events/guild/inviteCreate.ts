import {
  Events,
  Guild,
  Invite,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.InviteCreate,

  async execute(
    invite: Invite,
  ): Promise<void> {
    // invite.guild can be the lighter `InviteGuild` shape in some
    // contexts; this event only ever fires for guilds the bot is
    // actually in, so it should always be a full Guild — but guard
    // properly instead of casting, to stay consistent with the rest of
    // the codebase avoiding `as any`.
    if (!(invite.guild instanceof Guild)) return;

    await serverLogService.logInviteCreate(invite.guild, invite);
  },
};
