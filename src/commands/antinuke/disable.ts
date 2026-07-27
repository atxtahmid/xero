import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";

import { Permission } from "../../types/Command.js";
import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";
import { hasPermission } from "../../utils/permissions.js";

const command: Command = {
  permissions: [Permission.ADMIN],

  data: new SlashCommandBuilder()
    .setName("antinuke-disable")
    .setDescription("Disable the Anti-Nuke system.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

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

    await antiNukeSettingsService.disable(
      interaction.guild.id,
    );

    await interaction.reply({
      content:
        "🛑 Anti-Nuke has been disabled.",
      ephemeral: true,
    });
  },
};

export default command;