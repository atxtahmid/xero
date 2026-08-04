import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireActivePlayer, requireDjPermission } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-volume")
    .setDescription("Set the player volume (1-150).")
    .addIntegerOption((option) =>
      option
        .setName("percent")
        .setDescription("Volume percentage.")
        .setMinValue(1)
        .setMaxValue(150)
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

    const percent = interaction.options.getInteger("percent", true);
    const player = lavalinkManager.getPlayer(interaction.guildId)!;

    await player.setVolume(percent);

    await interaction.reply({ content: `🔊 Volume set to ${percent}%.` });
  },
};

export default command;
