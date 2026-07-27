import {
  GuildTextBasedChannel,
  PermissionFlagsBits,
} from "discord.js";

export async function isChannelLocked(
  channel: GuildTextBasedChannel,
): Promise<boolean> {
  const overwrite =
    channel.permissionOverwrites.cache.get(
      channel.guild.roles.everyone.id,
    );

  return (
    overwrite?.deny.has(
      PermissionFlagsBits.SendMessages,
    ) ?? false
  );
}

export async function lockChannel(
  channel: GuildTextBasedChannel,
): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: false,
    },
  );
}

export async function unlockChannel(
  channel: GuildTextBasedChannel,
): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: null,
    },
  );
}