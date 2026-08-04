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
    .setName("settings-adminrole")
    .setDescription("Set or clear the server's admin role.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription(
          "Role to grant full bot-admin access (same as the Administrator permission). Omit to clear.",
        )
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole("role");

    await guildSettingsService.setAdminRole(
      interaction.guild.id,
      role?.id ?? null,
    );

    await interaction.editReply({
      content: role
        ? `✅ Admin role set to ${role}. Members with this role now have full bot-admin access.`
        : "✅ Admin role cleared.",
    });
  },
};

export default command;
