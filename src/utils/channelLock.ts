import {
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export async function isChannelLocked(
  channel: TextChannel,
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
  channel: TextChannel,
): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: false,
    },
  );
}

export async function unlockChannel(
  channel: TextChannel,
): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: null,
    },
  );
}