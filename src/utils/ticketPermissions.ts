import {
  GuildMember,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";

/**
 * Returns whether the interacting user may manage the given ticket:
 * either they hold Manage Channels, or they carry the ticket panel's
 * support role.
 *
 * Deliberately checks `interaction.member instanceof GuildMember` before
 * touching `.roles.cache` — `interaction.member` can be the raw,
 * uncached `APIInteractionGuildMember` shape, whose `.roles` is a plain
 * string array with no `.cache` property. Reading `.cache` off that
 * (or off `undefined`, if `member` is null) throws. Every ticket
 * command/button should use this instead of checking `.roles` directly.
 */
export function isTicketStaff(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  supportRoleId: string | null | undefined,
): boolean {
  if (
    interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageChannels,
    )
  ) {
    return true;
  }

  if (!supportRoleId) {
    return false;
  }

  const member = interaction.member;

  if (!(member instanceof GuildMember)) {
    return false;
  }

  return member.roles.cache.has(supportRoleId);
}
