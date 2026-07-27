import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription(
      "View a member's moderation history.",
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
      await db.warning.findMany({
        where: {
          guildId:
            interaction.guild.id,
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({
          name:
            `${user.tag}'s Moderation History`,
          iconURL:
            user.displayAvatarURL(),
        })
        .setTimestamp();

    if (warnings.length === 0) {
      embed.setDescription(
        "No moderation history found.",
      );
    } else {
      embed.setDescription(
        warnings
          .slice(0, 10)
          .map(
            (warning, index) =>
              [
                `**${index + 1}. Warning**`,
                `Reason: ${warning.reason}`,
                `Moderator: <@${warning.moderatorId}>`,
                `Date: <t:${Math.floor(
                  warning.createdAt.getTime() /
                    1000,
                )}:F>`,
              ].join("\n"),
          )
          .join("\n\n"),
      );

      embed.setFooter({
        text:
          `Showing ${Math.min(
            warnings.length,
            10,
          )} of ${warnings.length} warning(s).`,
      });
    }

    await interaction.reply({
      embeds: [embed],
    });
  },
};

export default command;