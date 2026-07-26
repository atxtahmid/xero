import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import chatHistoryService from "../../services/chatHistoryService.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear your AI conversation history."),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: true,
    });

    if (!interaction.guild) {
      await interaction.editReply(
        "This command can only be used in a server.",
      );
      return;
    }

    await chatHistoryService.clearConversation(
      interaction.user.id,
      interaction.guild.id,
    );

    await interaction.editReply(
      "✅ Your AI conversation history has been cleared.",
    );
  },
};

export default command;