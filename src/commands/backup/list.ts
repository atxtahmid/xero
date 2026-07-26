import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";

export default {
  data: new SlashCommandBuilder()
    .setName("backup-list")
    .setDescription(
      "List available server backups.",
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

    const backups =
      await db.guildBackup.findMany({
        where: {
          guildId:
            interaction.guild.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          roles: true,
          channels: true,
        },
      });

    if (!backups.length) {
      return interaction.reply({
        content:
          "❌ No backups found.",
        ephemeral: true,
      });
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
          "📦 Server Backups",
        );

    for (const backup of backups) {
      embed.addFields({
        name: backup.id,
        value:
          `Created: <t:${Math.floor(
            backup.createdAt.getTime() /
              1000,
          )}:F>\n` +
          `Roles: ${backup.roles.length}\n` +
          `Channels: ${backup.channels.length}`,
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};