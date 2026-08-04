import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import type { User } from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { formatDuration } from "../../services/music/musicService.js";
import { requireActivePlayer } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

function progressBar(positionMs: number, durationMs: number): string {
  if (durationMs <= 0) return "🔴 LIVE";

  const totalBars = 20;
  const filled = Math.min(
    totalBars,
    Math.round((positionMs / durationMs) * totalBars),
  );

  return "▬".repeat(filled) + "🔘" + "▬".repeat(Math.max(0, totalBars - filled));
}

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-nowplaying")
    .setDescription("Show what's currently playing."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const activeCheck = requireActivePlayer(interaction);

    if (!activeCheck.success) {
      await interaction.reply({ content: activeCheck.message, ephemeral: true });
      return;
    }

    const player = lavalinkManager.getPlayer(interaction.guildId)!;
    const track = player.queue.current!;

    const embed = new EmbedBuilder()
      .setTitle("🎶 Now Playing")
      .setDescription(`**${track.info.title}**\nby \`${track.info.author}\``)
      .setColor(0x5865f2)
      .addFields({
        name: "\u200b",
        value: `${progressBar(player.position, track.info.duration)}\n\`${formatDuration(player.position)} / ${formatDuration(track.info.duration)}\``,
      })
      .setFooter({
        text: `Volume: ${player.volume}% • Loop: ${player.repeatMode} • Requested by ${track.requester ? "member" : "unknown"}`,
      });

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    const requester = track.requester as User | undefined;

    if (requester?.username) {
      embed.setFooter({
        text: `Volume: ${player.volume}% • Loop: ${player.repeatMode} • Requested by ${requester.username}`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
