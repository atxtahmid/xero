import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { formatDuration } from "../../services/music/musicService.js";
import { requireActivePlayer, requireDjPermission } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

/**
 * Accepts `mm:ss`, `hh:mm:ss`, or a bare number of seconds.
 */
function parseTimestamp(input: string): number | null {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const parts = trimmed.split(":").map(Number);

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes * 60 + seconds) * 1000;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  return null;
}

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-seek")
    .setDescription("Seek to a position in the current track.")
    .addStringOption((option) =>
      option
        .setName("timestamp")
        .setDescription("Position, e.g. 1:30 or 90.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const activeCheck = requireActivePlayer(interaction);

    if (!activeCheck.success) {
      await interaction.reply({ content: activeCheck.message, ephemeral: true });
      return;
    }

    const djCheck = await requireDjPermission(interaction);

    if (!djCheck.success) {
      await interaction.reply({ content: djCheck.message, ephemeral: true });
      return;
    }

    const player = lavalinkManager.getPlayer(interaction.guildId)!;
    const track = player.queue.current!;

    if (!track.info.isSeekable) {
      await interaction.reply({ content: "❌ This track can't be seeked (likely a livestream).", ephemeral: true });
      return;
    }

    const raw = interaction.options.getString("timestamp", true);
    const ms = parseTimestamp(raw);

    if (ms === null || ms < 0) {
      await interaction.reply({ content: "❌ Couldn't parse that timestamp. Try `1:30` or `90`.", ephemeral: true });
      return;
    }

    if (ms > track.info.duration) {
      await interaction.reply({ content: "❌ That's past the end of the track.", ephemeral: true });
      return;
    }

    await player.seek(ms);

    await interaction.reply({ content: `⏩ Seeked to \`${formatDuration(ms)}\`.` });
  },
};

export default command;
