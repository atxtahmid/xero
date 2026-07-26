import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import backupService from "../../services/backupService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("backup-create")
    .setDescription(
      "Create a manual server backup.",
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

    await backupService.createBackup(
      interaction.guild,
    );

    await backupService.deleteOldBackups(
      interaction.guild.id,
    );

    await interaction.editReply({
      content:
        "✅ Server backup created successfully.",
    });
  },
};