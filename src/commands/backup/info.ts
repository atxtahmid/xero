import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";

export default {
  data: new SlashCommandBuilder()
    .setName("backup-info")
    .setDescription(
      "View information about a backup.",
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
        include: {
          roles: true,
          channels: {
            include: {
              overwrites: true,
            },
          },
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

    const overwrites =
      backup.channels.reduce(
        (
          total,
          channel,
        ) =>
          total +
          channel.overwrites.length,
        0,
      );

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
          "📦 Backup Information",
        )
        .addFields(
          {
            name: "Backup ID",
            value: backup.id,
          },
          {
            name: "Created",
            value: `<t:${Math.floor(
              backup.createdAt.getTime() /
                1000,
            )}:F>`,
          },
          {
            name: "Roles",
            value:
              backup.roles.length.toString(),
            inline: true,
          },
          {
            name: "Channels",
            value:
              backup.channels.length.toString(),
            inline: true,
          },
          {
            name:
              "Permission Overwrites",
            value:
              overwrites.toString(),
            inline: true,
          },
        );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};