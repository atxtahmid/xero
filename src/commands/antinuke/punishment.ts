import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { PunishmentType } from "@prisma/client";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-punishment")
    .setDescription("Set the Anti-Nuke punishment.")
    .addStringOption((option) =>
      option
        .setName("punishment")
        .setDescription("Punishment to apply")
        .setRequired(true)
        .addChoices(
          {
            name: "Remove Roles",
            value: PunishmentType.REMOVE_ROLES,
          },
          {
            name: "Timeout",
            value: PunishmentType.TIMEOUT,
          },
          {
            name: "Kick",
            value: PunishmentType.KICK,
          },
          {
            name: "Ban",
            value: PunishmentType.BAN,
          },
        ),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      return interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });
    }

    const punishment =
      interaction.options.getString(
        "punishment",
        true,
      ) as PunishmentType;

    await antiNukeSettingsService.setPunishment(
      interaction.guild.id,
      punishment,
    );

    await interaction.reply({
      content: `✅ Anti-Nuke punishment updated to **${punishment}**.`,
      ephemeral: true,
    });
  },
};