import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { PunishmentType } from "@prisma/client";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";

const command: Command = {
  permissions: [
    Permission.ANTINUKE,
  ],

  guildOnly: true,

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("antinuke-punishment")
    .setDescription(
      "Set the Anti-Nuke punishment.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    )
    .addStringOption((option) =>
      option
        .setName("punishment")
        .setDescription(
          "Punishment to apply",
        )
        .setRequired(true)
        .addChoices(
          {
            name: "Remove Roles",
            value:
              PunishmentType.REMOVE_ROLES,
          },
          {
            name: "Timeout",
            value:
              PunishmentType.TIMEOUT,
          },
          {
            name: "Kick",
            value:
              PunishmentType.KICK,
          },
          {
            name: "Ban",
            value:
              PunishmentType.BAN,
          },
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
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
      content:
        `✅ Anti-Nuke punishment updated to **${punishment}**.`,
      ephemeral: true,
    });
  },
};

export default command;