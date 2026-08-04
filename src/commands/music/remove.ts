import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireDjPermission } from "../../utils/musicChecks.js";
import { trackLine } from "../../services/music/musicService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName("music-remove")
    .setDescription("Remove a track from the queue by position.")
    .addIntegerOption((option) =>
      option
        .setName("position")
        .setDescription("Position in the queue (see /music-queue).")
        .setMinValue(1)
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const player = lavalinkManager.getPlayer(interaction.guildId);

    if (!player || player.queue.tracks.length === 0) {
      await interaction.reply({ content: "❌ The queue is empty.", ephemeral: true });
      return;
    }

    const djCheck = await requireDjPermission(interaction);

    if (!djCheck.success) {
      await interaction.reply({ content: djCheck.message, ephemeral: true });
      return;
    }

    const position = interaction.options.getInteger("position", true);
    const index = position - 1;

    if (index < 0 || index >= player.queue.tracks.length) {
      await interaction.reply({
        content: `❌ Invalid position — the queue only has ${player.queue.tracks.length} track(s).`,
        ephemeral: true,
      });
      return;
    }

    const result = await player.queue.remove(index);
    const removed = result?.removed[0];

    await interaction.reply({
      content: removed ? `🗑️ Removed ${trackLine(removed)}` : "🗑️ Removed.",
    });
  },
};

export default command;
