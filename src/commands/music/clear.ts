import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireDjPermission } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName("music-clear")
    .setDescription("Clear the queue without stopping the current track."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const player = lavalinkManager.getPlayer(interaction.guildId);

    if (!player || player.queue.tracks.length === 0) {
      await interaction.reply({ content: "❌ The queue is already empty.", ephemeral: true });
      return;
    }

    const djCheck = await requireDjPermission(interaction);

    if (!djCheck.success) {
      await interaction.reply({ content: djCheck.message, ephemeral: true });
      return;
    }

    const cleared = player.queue.tracks.length;

    await player.queue.splice(0, cleared);

    await interaction.reply({ content: `🧹 Cleared ${cleared} track(s) from the queue.` });
  },
};

export default command;
