import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-threshold")
    .setDescription("Set the Anti-Nuke threshold.")
    .addIntegerOption((option) =>
      option
        .setName("value")
        .setDescription("Threshold (1-20)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(20),
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

    const value =
      interaction.options.getInteger(
        "value",
        true,
      );

    await antiNukeSettingsService.setThreshold(
      interaction.guild.id,
      value,
    );

    await interaction.reply({
      content: `✅ Anti-Nuke threshold updated to **${value}**.`,
      ephemeral: true,
    });
  },
};