import type { ChatInputCommandInteraction } from "discord.js";
import type { Player, Track, UnresolvedTrack } from "lavalink-client";

import guildSettingsService from "../database/guildSettingsService.js";
import musicAccessManager from "../../managers/musicAccessManager.js";
import lavalinkManager from "./lavalinkManager.js";

// Gets the existing player for this guild, or creates+connects a fresh one
// in the invoking member's voice channel using the guild's configured
// default volume.
export async function getOrCreatePlayer(
  interaction: ChatInputCommandInteraction,
  voiceChannelId: string,
): Promise<Player> {
  const guildId = interaction.guildId;

  if (!guildId) {
    throw new Error("getOrCreatePlayer called outside a guild.");
  }

  let player = lavalinkManager.getPlayer(guildId);

  if (player) {
    return player;
  }

  const settings = await guildSettingsService.get(guildId);

  player = lavalinkManager.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId: interaction.channelId,
    selfDeaf: true,
    volume: settings.musicDefaultVolume,
  });

  await player.connect();

  musicAccessManager.startSession(guildId, interaction.user.id);

  return player;
}

// Formats a millisecond duration as H:MM:SS / M:SS. Live streams
// report a duration of 0, which we show distinctly.
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "LIVE";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

// Accepts Track | UnresolvedTrack since queue entries aren't always fully
// resolved yet (e.g. Spotify links before lavalink-client fills in
// duration/encoded) — duration falls back to 0 ("LIVE") when missing.
export function trackLine(track: Track | UnresolvedTrack, index?: number): string {
  const prefix = index !== undefined ? `\`${index + 1}.\` ` : "";
  const duration = formatDuration(track.info.duration ?? 0);

  return `${prefix}**${track.info.title}** by \`${track.info.author}\` — \`${duration}\``;
}

export default {
  getOrCreatePlayer,
  formatDuration,
  trackLine,
};
