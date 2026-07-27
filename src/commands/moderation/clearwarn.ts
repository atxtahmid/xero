import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import warningService from "../../services/warningService.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("clearwarn")
    .setDescription(
      "Remove one or all warnings from a member.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member whose warnings will be removed.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription(
          "Clear one warning or all warnings.",
        )
        .setRequired(true)
        .addChoices(
          {
            name: "One",
            value: "one",
          },
          {
            name: "All",
            value: "all",
          },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("warning")
        .setDescription(
          "Warning number from /warnings.",
        )
        .setMinValue(1)
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

    const user =
      interaction.options.getUser(
        "user",
        true,
      );

    const type =
      interaction.options.getString(
        "type",
        true,
      );

    if (type === "all") {
      await warningService.clear(
        interaction.guild.id,
        user.id,
      );

      await interaction.reply({
        content: `✅ Cleared all warnings for **${user.tag}**.`,
      });

      return;
    }

    const number =
      interaction.options.getInteger(
        "warning",
      );

    if (!number) {
      await interaction.reply({
        content:
          "❌ You must provide a warning number.",
        ephemeral: true,
      });

      return;
    }

    const warnings =
      await warningService.getAll(
        interaction.guild.id,
        user.id,
      );

    if (
      number < 1 ||
      number > warnings.length
    ) {
      await interaction.reply({
        content:
          "❌ Invalid warning number.",
        ephemeral: true,
      });

      return;
    }

    await warningService.delete(
      warnings[number - 1].id,
    );

    await interaction.reply({
      content: `✅ Removed warning #${number} from **${user.tag}**.`,
    });
  },
};

export default command;