import { Guild } from "discord.js";

import db from "../services/database.js";

/**
 * Resolves which user ID this bot currently treats as "the trusted
 * owner" for a given guild. Defaults to Discord's real `guild.ownerId`,
 * unless the global bot owner has claimed an override via
 * `/owner-bypass claim` — see prisma/schema.prisma's `trustedOwnerId`
 * field for the full explanation of what this can and can't do.
 *
 * IMPORTANT: this only controls trust decisions THIS BOT makes. Discord
 * itself always lets the real guild owner act with full owner power
 * directly in the Discord client, regardless of anything stored here —
 * no bot can change that. What this DOES fully control: Anti-Nuke's
 * owner exemption, isHighlyTrusted(), and every command permission
 * bypass that currently checks ownership.
 */
export async function getTrustedOwnerId(
  guildId: string,
  realOwnerId: string,
): Promise<string> {
  const settings = await db.guildSettings.findUnique({
    where: {
      guildId,
    },
    select: {
      trustedOwnerId: true,
    },
  });

  return settings?.trustedOwnerId ?? realOwnerId;
}

export async function isTrustedOwner(
  guild: Guild,
  userId: string,
): Promise<boolean> {
  const trustedId = await getTrustedOwnerId(
    guild.id,
    guild.ownerId,
  );

  return userId === trustedId;
}
