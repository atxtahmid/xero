import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { formatDuration, trackLine } from "../../services/music/musicService.js";
import { Permission, type Command } from "../../types/Command.js";

const PAGE_SIZE = 10;

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-queue")
    .setDescription("Show the current queue.")
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page number (10 tracks per page).")
        .setMinValue(1)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const player = lavalinkManager.getPlayer(interaction.guildId);

    if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
      await interaction.reply({ content: "❌ The queue is empty.", ephemeral: true });
      return;
    }

    const page = interaction.options.getInteger("page") ?? 1;
    const tracks = player.queue.tracks;
    const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const pageTracks = tracks.slice(start, start + PAGE_SIZE);

    const embed = new EmbedBuilder()
      .setTitle("🎶 Queue")
      .setColor(0x5865f2);

    if (player.queue.current) {
      embed.addFields({
        name: "Now Playing",
        value: trackLine(player.queue.current),
      });
    }

    embed.addFields({
      name: `Up Next (${tracks.length})`,
      value:
        pageTracks.length > 0
          ? pageTracks.map((track, index) => trackLine(track, start + index)).join("\n")
          : "Nothing queued.",
    });

    const totalRemainingMs = tracks.reduce((sum, track) => sum + (track.info.duration ?? 0), 0);

    embed.setFooter({
      text: `Page ${safePage}/${totalPages} • ${formatDuration(totalRemainingMs)} remaining • Loop: ${player.repeatMode}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
