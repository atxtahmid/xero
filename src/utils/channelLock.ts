import {
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

/**
 * Returns whether the channel is locked for @everyone.
 */
export function isChannelLocked(
  channel: TextChannel,
): boolean {
  const everyoneId = channel.guild.roles.everyone.id;

  const overwrite =
    channel.permissionOverwrites.cache.get(
      everyoneId,
    );

  return overwrite?.deny.has(
    PermissionFlagsBits.SendMessages,
  ) ?? false;
}

/**
 * Locks the channel by preventing @everyone from sending messages.
 */
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

/**
 * Unlocks the channel by allowing @everyone to send messages.
 */
export async function unlockChannel(
  channel: TextChannel,
): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: true,
    },
  );
}