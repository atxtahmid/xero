import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

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
    .setName("clean")
    .setDescription(
      "Clean messages using filters.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages,
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription(
          "Messages to clean.",
        )
        .setRequired(true)
        .addChoices(
          {
            name: "Bots",
            value: "bots",
          },
          {
            name: "Humans",
            value: "humans",
          },
          {
            name: "Links",
            value: "links",
          },
          {
            name: "Attachments",
            value: "attachments",
          },
          {
            name: "User",
            value: "user",
          },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription(
          "Messages to scan (1-100).",
        )
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription(
          "Required when type is User.",
        )
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (
      !interaction.inGuild() ||
      !interaction.channel?.isTextBased()
    ) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server text channel.",
        ephemeral: true,
      });

      return;
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    const type =
      interaction.options.getString(
        "type",
        true,
      );

    const limit =
      interaction.options.getInteger(
        "limit",
        true,
      );

    const target =
      interaction.options.getUser(
        "target",
      );

    if (
      type === "user" &&
      !target
    ) {
      await interaction.editReply(
        "❌ You must specify a target user.",
      );

      return;
    }

    const messages =
      await interaction.channel.messages.fetch({
        limit,
      });

    const filtered =
      messages.filter(
        (
          message: Message,
        ) => {
          switch (type) {
            case "bots":
              return message.author.bot;

            case "humans":
              return !message.author.bot;

            case "links":
              return /https?:\/\//i.test(
                message.content,
              );

            case "attachments":
              return (
                message.attachments.size >
                0
              );

            case "user":
              return (
                message.author.id ===
                target!.id
              );

            default:
              return false;
          }
        },
      );

    const deleted =
      await interaction.channel.bulkDelete(
        filtered,
        true,
      );

    await interaction.editReply(
      `🧹 Deleted **${deleted.size}** message(s).`,
    );
  },
};

export default command;