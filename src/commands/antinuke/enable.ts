import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-enable")
    .setDescription("Enable the Anti-Nuke system.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

    await antiNukeSettingsService.enable(
      interaction.guild.id,
    );

    await interaction.reply({
      content:
        "✅ Anti-Nuke has been enabled.",
      ephemeral: true,
    });
  },
};