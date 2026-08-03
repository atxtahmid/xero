import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import guildSettingsService from "../../services/guildSettingsService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.CONFIG],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("settings-ai")
    .setDescription("Enable or disable Xero's AI chat for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((option) =>
      option
        .setName("enabled")
        .setDescription("Whether AI chat should be enabled.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const enabled = interaction.options.getBoolean("enabled", true);

    await guildSettingsService.setAiEnabled(interaction.guild.id, enabled);

    await interaction.editReply({
      content: enabled
        ? "✅ AI chat is now **enabled** for this server."
        : "✅ AI chat is now **disabled** for this server.",
    });
  },
};

export default command;
