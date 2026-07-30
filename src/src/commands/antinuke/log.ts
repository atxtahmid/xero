import {
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";

import { Permission } from "../../types/Command.js";
import db from "../../services/database.js";
import { hasPermission } from "../../utils/permissions.js";

const command: Command = {
  permissions: [Permission.ADMIN],

  data: new SlashCommandBuilder()
    .setName("antinuke-log")
    .setDescription(
      "Configure the Anti-Nuke log channel.",
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription(
          "Set the Anti-Nuke log channel.",
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Log channel")
            .addChannelTypes(
              ChannelType.GuildText,
            )
            .setRequired(true),
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription(
          "Remove the Anti-Nuke log channel.",
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription(
          "View the current Anti-Nuke log channel.",
        ),
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ) as Command["data"],

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (
      !(await hasPermission(
        interaction,
        [Permission.ADMIN],
      ))
    ) {
      await interaction.reply({
        content:
          "❌ You do not have permission to use this command.",
        ephemeral: true,
      });

      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

    const subcommand =
      interaction.options.getSubcommand();

    switch (subcommand) {
      case "set": {
        const channel =
          interaction.options.getChannel(
            "channel",
            true,
          );

        await db.guildSettings.upsert({
          where: {
            guildId: interaction.guild.id,
          },
          update: {
            antiNukeLogChannelId:
              channel.id,
          },
          create: {
            guildId: interaction.guild.id,
            antiNukeLogChannelId:
              channel.id,
          },
        });

        await interaction.reply({
          content: `✅ Anti-Nuke log channel set to ${channel}.`,
          ephemeral: true,
        });

        return;
      }

      case "remove": {
        await db.guildSettings.upsert({
          where: {
            guildId: interaction.guild.id,
          },
          update: {
            antiNukeLogChannelId: null,
          },
          create: {
            guildId: interaction.guild.id,
          },
        });

        await interaction.reply({
          content:
            "✅ Anti-Nuke log channel removed.",
          ephemeral: true,
        });

        return;
      }

      case "view": {
        const settings =
          await db.guildSettings.findUnique({
            where: {
              guildId:
                interaction.guild.id,
            },
          });

        if (
          !settings?.antiNukeLogChannelId
        ) {
          await interaction.reply({
            content:
              "❌ No Anti-Nuke log channel is configured.",
            ephemeral: true,
          });

          return;
        }

        await interaction.reply({
          content: `📜 Current Anti-Nuke log channel: <#${settings.antiNukeLogChannelId}>`,
          ephemeral: true,
        });

        return;
      }
    }
  },
};

export default command;