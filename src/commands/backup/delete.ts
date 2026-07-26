import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";

export default {
  data: new SlashCommandBuilder()
    .setName("backup-delete")
    .setDescription(
      "Delete a server backup.",
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription(
          "Backup ID",
        )
        .setRequired(true),
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

    const id =
      interaction.options.getString(
        "id",
        true,
      );

    const backup =
      await db.guildBackup.findUnique({
        where: {
          id,
        },
      });

    if (
      !backup ||
      backup.guildId !==
        interaction.guild.id
    ) {
      return interaction.reply({
        content:
          "❌ Backup not found.",
        ephemeral: true,
      });
    }

    await db.guildBackup.delete({
      where: {
        id,
      },
    });

    await interaction.reply({
      content:
        "✅ Backup deleted successfully.",
      ephemeral: true,
    });
  },
};