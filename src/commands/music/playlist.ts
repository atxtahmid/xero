import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { Track, UnresolvedTrack } from "lavalink-client";

import playlistService from "../../services/database/playlistService.js";
import lavalinkManager from "../../services/music/lavalinkManager.js";
import { getOrCreatePlayer, formatDuration } from "../../services/music/musicService.js";
import { requireVoiceChannel } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-playlist")
    .setDescription("Manage your saved playlists.")
    .addSubcommand((sub) =>
      sub
        .setName("save")
        .setDescription("Save the current queue as a playlist.")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name.").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("load")
        .setDescription("Load a saved playlist into the current queue.")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name.").setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List your saved playlists."))
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View the tracks in one of your playlists.")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name.").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete one of your playlists.")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name.").setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "save") {
      await handleSave(interaction);
    } else if (sub === "load") {
      await handleLoad(interaction);
    } else if (sub === "list") {
      await handleList(interaction);
    } else if (sub === "view") {
      await handleView(interaction);
    } else if (sub === "delete") {
      await handleDelete(interaction);
    }
  },
};

async function handleSave(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = lavalinkManager.getPlayer(interaction.guildId!);

  if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
    await interaction.reply({ content: "❌ There's nothing playing to save.", ephemeral: true });
    return;
  }

  const name = interaction.options.getString("name", true);
  const tracks: (Track | UnresolvedTrack)[] = player.queue.current
    ? [player.queue.current, ...player.queue.tracks]
    : [...player.queue.tracks];

  await playlistService.save(interaction.user.id, name, tracks);

  await interaction.reply({ content: `💾 Saved **${tracks.length}** track(s) as playlist \`${name}\`.` });
}

async function handleLoad(interaction: ChatInputCommandInteraction): Promise<void> {
  const voiceCheck = requireVoiceChannel(interaction);

  if (!voiceCheck.success) {
    await interaction.reply({ content: voiceCheck.message, ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const name = interaction.options.getString("name", true);
  const playlist = await playlistService.find(interaction.user.id, name);

  if (!playlist || playlist.tracks.length === 0) {
    await interaction.editReply({ content: `❌ No playlist named \`${name}\` found.` });
    return;
  }

  const player = await getOrCreatePlayer(interaction, voiceCheck.channelId);

  let loaded = 0;

  for (const savedTrack of playlist.tracks) {
    const query = savedTrack.uri ?? `${savedTrack.title} ${savedTrack.author}`;

    const result = await player.search({ query }, interaction.user);

    if (result.tracks.length > 0) {
      await player.queue.add(result.tracks[0]);
      loaded++;
    }
  }

  if (loaded === 0) {
    await interaction.editReply({ content: "❌ Couldn't resolve any tracks from that playlist." });
    return;
  }

  if (!player.playing && !player.paused) {
    await player.play();
  }

  await interaction.editReply({
    content: `▶️ Loaded ${loaded}/${playlist.tracks.length} track(s) from \`${name}\`.`,
  });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const playlists = await playlistService.list(interaction.user.id);

  if (playlists.length === 0) {
    await interaction.reply({ content: "You don't have any saved playlists yet.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎵 ${interaction.user.username}'s Playlists`)
    .setColor(0x5865f2)
    .setDescription(
      playlists.map((p) => `**${p.name}** — ${p._count.tracks} track(s)`).join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString("name", true);
  const playlist = await playlistService.find(interaction.user.id, name);

  if (!playlist) {
    await interaction.reply({ content: `❌ No playlist named \`${name}\` found.`, ephemeral: true });
    return;
  }

  const totalMs = playlist.tracks.reduce((sum, t) => sum + t.durationMs, 0);

  const embed = new EmbedBuilder()
    .setTitle(`🎵 ${playlist.name}`)
    .setColor(0x5865f2)
    .setDescription(
      playlist.tracks
        .slice(0, 20)
        .map((t, i) => `\`${i + 1}.\` **${t.title}** by \`${t.author}\` — \`${formatDuration(t.durationMs)}\``)
        .join("\n") || "Empty.",
    )
    .setFooter({
      text: `${playlist.tracks.length} track(s) • ${formatDuration(totalMs)} total${playlist.tracks.length > 20 ? " • showing first 20" : ""}`,
    });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString("name", true);
  const deleted = await playlistService.delete(interaction.user.id, name);

  await interaction.reply({
    content: deleted ? `🗑️ Deleted playlist \`${name}\`.` : `❌ No playlist named \`${name}\` found.`,
    ephemeral: !deleted,
  });
}

export default command;
