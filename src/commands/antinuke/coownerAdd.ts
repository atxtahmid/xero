import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeCoOwnerService from "../../services/antiNukeCoOwnerService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-add")
    .setDescription("Add an Anti-Nuke co-owner.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to add")
        .setRequired(true),
    )
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

    const user = interaction.options.getUser(
      "user",
      true,
    );

    await antiNukeCoOwnerService.add(
      interaction.guild.id,
      user.id,
    );

    await interaction.reply({
      content: `✅ ${user.tag} is now an Anti-Nuke Co-Owner.`,
      ephemeral: true,
    });
  },
};