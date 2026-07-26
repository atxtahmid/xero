import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeCoOwnerService from "../../services/antiNukeCoOwnerService.js";

interface CoOwner {
  userId: string;
}

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-list")
    .setDescription("View Anti-Nuke co-owners.")
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

    const coOwners =
      (await antiNukeCoOwnerService.getAll(
        interaction.guild.id,
      )) as CoOwner[];

    const description =
      coOwners.length === 0
        ? "No Anti-Nuke co-owners configured."
        : coOwners
            .map(
              (
                owner: CoOwner,
                index: number,
              ) => `${index + 1}. <@${owner.userId}>`,
            )
            .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Anti-Nuke Co-Owners")
      .setDescription(description);

    await interaction.reply({
      embeds: [embed],
    });
  },
};