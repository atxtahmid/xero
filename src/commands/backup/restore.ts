import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import restoreService from "../../services/restoreService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("backup-restore")
    .setDescription(
      "Restore the latest server backup.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      return interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      await restoreService.restore(
        interaction.guild,
      );

      await interaction.editReply({
        content:
          "✅ Latest backup restored successfully.",
      });
    } catch (error) {
      console.error(error);

      await interaction.editReply({
        content:
          "❌ Failed to restore backup.",
      });
    }
  },
};