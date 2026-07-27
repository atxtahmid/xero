import {
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
} from "discord.js";

import db from "./database.js";

export interface ModLogOptions {
  guild: Guild;

  moderator: User;

  target: User;

  action: string;

  reason: string;

  caseId: string;

  duration?: string;
}

export async function sendModLog(
  options: ModLogOptions,
) {
  const settings =
    await db.guildSettings.findUnique({
      where: {
        guildId:
          options.guild.id,
      },
    });

  if (
    !settings?.logChannelId
  ) {
    return;
  }

  const channel =
    await options.guild.channels.fetch(
      settings.logChannelId,
    );

  if (
    !channel ||
    !(channel instanceof TextChannel)
  ) {
    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "Moderation Log",
      )
      .addFields(
        {
          name: "Case ID",
          value: options.caseId,
          inline: true,
        },
        {
          name: "Action",
          value: options.action,
          inline: true,
        },
        {
          name: "Moderator",
          value: `${options.moderator.tag}\n(${options.moderator.id})`,
        },
        {
          name: "Target",
          value: `${options.target.tag}\n(${options.target.id})`,
        },
        {
          name: "Reason",
          value: options.reason,
        },
      )
      .setTimestamp();

  if (
    options.duration
  ) {
    embed.addFields({
      name: "Duration",
      value:
        options.duration,
      inline: true,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}