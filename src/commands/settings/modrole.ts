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
    .setName("settings-modrole")
    .setDescription("Set or clear the server's moderator role.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to grant moderator-level command access. Omit to clear.")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole("role");

    await guildSettingsService.setModRole(
      interaction.guild.id,
      role?.id ?? null,
    );

    await interaction.editReply({
      content: role
        ? `✅ Moderator role set to ${role}.`
        : "✅ Moderator role cleared.",
    });
  },
};

export default command;
