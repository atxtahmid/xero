import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { Track } from "lavalink-client";

import { getOrCreatePlayer, trackLine } from "../../services/music/musicService.js";
import { requireVoiceChannel } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-play")
    .setDescription("Play a song or playlist, or add it to the queue.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("A song name, URL, or playlist URL.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const voiceCheck = requireVoiceChannel(interaction);

    if (!voiceCheck.success) {
      await interaction.reply({ content: voiceCheck.message, ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query", true);

    const player = await getOrCreatePlayer(interaction, voiceCheck.channelId);

    const result = await player.search({ query }, interaction.user);

    if (result.loadType === "error") {
      await interaction.editReply({ content: "❌ Something went wrong searching for that." });
      return;
    }

    if (result.loadType === "empty" || result.tracks.length === 0) {
      await interaction.editReply({ content: "❌ No results found for that query." });
      return;
    }

    if (result.loadType === "playlist") {
      await player.queue.add(result.tracks);

      await interaction.editReply({
        content: `✅ Queued playlist **${result.playlist?.name ?? "Unknown"}** — ${result.tracks.length} track(s).`,
      });
    } else {
      const track = result.tracks[0] as Track;

      await player.queue.add(track);

      await interaction.editReply({
        content: `✅ Queued ${trackLine(track)}`,
      });
    }

    if (!player.playing && !player.paused) {
      await player.play();
    }
  },
};

export default command;
