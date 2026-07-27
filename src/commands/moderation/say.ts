import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
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

  cooldown: 3,

  data: (
    new SlashCommandBuilder()
      .setName("say")
      .setDescription(
        "Make the bot send a message.",
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageMessages,
      )
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription(
            "Message to send.",
          )
          .setRequired(true),
      )
  ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    const message =
      interaction.options.getString(
        "message",
        true,
      );

    if (!interaction.channel) {
      await interaction.reply({
        content:
          "❌ Channel not found.",
        ephemeral: true,
      });

      return;
    }

    await interaction.reply({
      content: "✅ Message sent.",
      ephemeral: true,
    });

    await (
      interaction.channel as TextChannel
    ).send({
      content: message,
    });
  },
};

export default command;