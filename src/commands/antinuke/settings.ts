import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-settings")
    .setDescription("View Anti-Nuke settings.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral: true,
      });
    }

    const settings =
      await antiNukeSettingsService.get(
        interaction.guild.id,
      );

    if (!settings) {
      return interaction.reply({
        content:
          "⚠️ Anti-Nuke has not been configured yet.\nUse `/antinuke-enable` first.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Anti-Nuke Settings")
      .addFields(
        {
          name: "Status",
          value: settings.enabled
            ? "✅ Enabled"
            : "❌ Disabled",
          inline: true,
        },
        {
          name: "Threshold",
          value: settings.threshold.toString(),
          inline: true,
        },
        {
          name: "Punishment",
          value: settings.punishment,
          inline: true,
        },
      );

    await interaction.reply({
      embeds: [embed],
    });
  },
};