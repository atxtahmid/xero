import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import aiService from "../../services/aiService.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with Xero AI.")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("Your message")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const prompt = interaction.options.getString("prompt", true);

    const response = await aiService.chat(
      interaction.user.id,
      interaction.guild.id,
      prompt,
    );

    await interaction.editReply(response);
  },
};

export default command;