import {
  Events,
  type GuildMember,
} from "discord.js";

import db from "../../database/prisma.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,

  async execute(
    member: GuildMember,
  ): Promise<void> {
    const settings =
      await db.guildSettings.findUnique({
        where: {
          guildId:
            member.guild.id,
        },
      });

    if (
      !settings?.welcomeChannelId ||
      !settings.leaveMessage
    ) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        settings.welcomeChannelId,
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return;
    }

    const message =
      settings.leaveMessage
        .replace(
          "{user}",
          member.user.tag,
        )
        .replace(
          "{server}",
          member.guild.name,
        );

    await channel.send(message);
  },
};

export default event;