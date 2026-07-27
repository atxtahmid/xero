import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

import warningService from "../../services/warningService.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription(
      "View a member's warnings.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member to view.",
        )
        .setRequired(true),
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

    const warnings =
      await warningService.getAll(
        interaction.guild.id,
        user.id,
      );

    const embed =
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(
          `⚠️ Warnings • ${user.tag}`,
        )
        .setTimestamp();

    if (warnings.length === 0) {
      embed.setDescription(
        "No warnings found.",
      );
    } else {
      embed.setDescription(
        warnings
          .map(
            (warning, index) =>
              `**${index + 1}.** ${warning.reason}\n<t:${Math.floor(
                warning.createdAt.getTime() /
                  1000,
              )}:R>`,
          )
          .join("\n\n"),
      );
    }

    await interaction.reply({
      embeds: [embed],
    });
  },
};

export default command;