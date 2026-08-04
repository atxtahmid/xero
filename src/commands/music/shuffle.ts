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
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-shuffle")
    .setDescription("Shuffle the current queue."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const player = lavalinkManager.getPlayer(interaction.guildId);

    if (!player || player.queue.tracks.length < 2) {
      await interaction.reply({ content: "❌ Not enough tracks in the queue to shuffle.", ephemeral: true });
      return;
    }

    const djCheck = await requireDjPermission(interaction);

    if (!djCheck.success) {
      await interaction.reply({ content: djCheck.message, ephemeral: true });
      return;
    }

    await player.queue.shuffle();

    await interaction.reply({ content: "🔀 Queue shuffled." });
  },
};

export default command;
