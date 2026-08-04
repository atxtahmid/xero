import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

import guildSettingsService from "../services/database/guildSettingsService.js";
import lavalinkManager from "../services/music/lavalinkManager.js";
import musicAccessManager from "../managers/musicAccessManager.js";
import { isTrustedOwner } from "./ownerTrust.js";

type CheckResult = { success: true } | { success: false; message: string };

/**
 * Confirms the invoking user is in a voice channel, and if the bot is
 * already playing somewhere in this guild, that they're in the *same*
 * channel. Returns the channel id to connect to on success.
 */
export function requireVoiceChannel(
  interaction: ChatInputCommandInteraction,
): { success: true; channelId: string } | { success: false; message: string } {
  const member = interaction.member;

  if (!(member instanceof GuildMember) || !member.voice.channelId) {
    return {
      success: false,
      message: "❌ You need to be in a voice channel to use this.",
    };
  }

  const player = lavalinkManager.getPlayer(interaction.guildId ?? "");

  if (player?.voiceChannelId && player.voiceChannelId !== member.voice.channelId) {
    return {
      success: false,
      message: "❌ I'm already playing in another voice channel here.",
    };
  }

  return { success: true, channelId: member.voice.channelId };
}

/**
 * Confirms a player exists and is actually playing something.
 */
export function requireActivePlayer(
  interaction: ChatInputCommandInteraction,
): CheckResult {
  const player = lavalinkManager.getPlayer(interaction.guildId ?? "");

  if (!player || !player.queue.current) {
    return {
      success: false,
      message: "❌ Nothing is playing right now.",
    };
  }

  return { success: true };
}

/**
 * Music control gate for skip/stop/volume/loop/shuffle/remove/clear/seek/
 * filters/leave. Passes if:
 *  - the user is the trusted server owner or has Administrator, or
 *  - a DJ role is configured and the user holds it, or
 *  - the user is whoever invited the bot into the current voice session,
 *    or someone that person granted access to (see musicAccessManager —
 *    this works with or without a DJ role configured).
 */
export async function requireDjPermission(
  interaction: ChatInputCommandInteraction,
): Promise<CheckResult> {
  const guild = interaction.guild;
  const member = interaction.member;

  if (!guild || !(member instanceof GuildMember)) {
    return {
      success: false,
      message: "❌ Unable to verify your permissions.",
    };
  }

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return { success: true };
  }

  if (await isTrustedOwner(guild, member.id)) {
    return { success: true };
  }

  const settings = await guildSettingsService.get(guild.id);

  if (settings.djRoleId && member.roles.cache.has(settings.djRoleId)) {
    return { success: true };
  }

  if (musicAccessManager.hasAccess(guild.id, member.id)) {
    return { success: true };
  }

  if (settings.djRoleId) {
    return {
      success: false,
      message: "❌ You need the DJ role, or access granted by whoever added the bot, to control music.",
    };
  }

  const inviterId = musicAccessManager.getInviter(guild.id);
  const inviter = inviterId ? await guild.members.fetch(inviterId).catch(() => null) : null;

  return {
    success: false,
    message: inviter
      ? `❌ Only ${inviter} (or someone they've granted access to) can control music. Ask them to use \`/music-access add\`.`
      : "❌ Only whoever added the bot to voice (or someone they've granted access to) can control music.",
  };
}
