import {
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
    .setName("settings-djrole")
    .setDescription("Set or clear the role required to control music playback.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role required for music control. Omit to clear (anyone in-VC can control).")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole("role");

    await guildSettingsService.setDjRole(interaction.guild.id, role?.id ?? null);

    await interaction.editReply({
      content: role
        ? `✅ DJ role set to ${role}. Only they (or admins/the server owner) can control music now.`
        : "✅ DJ role cleared — anyone in the bot's voice channel can control music.",
    });
  },
};

export default command;
