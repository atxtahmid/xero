import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import guildSettingsService from "../../services/database/guildSettingsService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.CONFIG],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("settings-ailog")
    .setDescription("Set or clear the AI chat usage log channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send AI chat logs to. Omit to clear.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");

    await guildSettingsService.setAiLogChannel(
      interaction.guild.id,
      channel?.id ?? null,
    );

    await interaction.editReply({
      content: channel
        ? `✅ AI chat usage will now be logged to ${channel}.`
        : "✅ AI chat logging disabled.",
    });
  },
};

export default command;
