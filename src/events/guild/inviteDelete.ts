import {
  Events,
  Guild,
  Invite,
} from "discord.js";

import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.InviteDelete,

  async execute(
    invite: Invite,
  ): Promise<void> {
    if (!(invite.guild instanceof Guild)) return;

    await serverLogService.logInviteDelete(invite.guild, invite);
  },
};
