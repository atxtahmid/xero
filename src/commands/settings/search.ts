import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import guildSettingsService from "../../services/database/guildSettingsService.js";
import tavilyService from "../../services/ai/tavilyService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.CONFIG],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("settings-search")
    .setDescription("Enable or disable live web search for Xero's AI chat.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((option) =>
      option
        .setName("enabled")
        .setDescription("Whether AI chat may search the web for current information.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const enabled = interaction.options.getBoolean("enabled", true);

    await guildSettingsService.setSearchEnabled(interaction.guild.id, enabled);

    const warning =
      enabled && !tavilyService.isConfigured()
        ? "\n⚠️ Note: no Tavily API key is configured on this bot instance, so search won't actually run until one is set."
        : "";

    await interaction.editReply({
      content:
        (enabled
          ? "✅ Web search is now **enabled** for AI chat on this server."
          : "✅ Web search is now **disabled** for AI chat on this server.") +
        warning,
    });
  },
};

export default command;
