import {
  ChannelType,
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
    .setName("settings-serverlog")
    .setDescription(
      "Set or clear the Server Logs channel (message delete/edit, member join/leave).",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send server logs to. Omit to disable.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");

    await guildSettingsService.setServerLogChannel(
      interaction.guild.id,
      channel?.id ?? null,
    );

    await interaction.editReply({
      content: channel
        ? `✅ Server Logs will now be sent to ${channel}.`
        : "✅ Server Logs disabled.",
    });
  },
};

export default command;
