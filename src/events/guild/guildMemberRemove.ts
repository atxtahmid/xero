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

    /*
     * Wait a little.
     * Discord audit logs are usually delayed by
     * a few hundred milliseconds.
     */
    await new Promise((resolve) =>
      setTimeout(resolve, 1500),
    );

    await antiNukeHelper.handle(
      member.guild,
      AntiNukeAction.MASS_KICK,
    );
  },
};