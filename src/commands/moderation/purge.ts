import {
  ChatInputCommandInteraction,
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
    .setName("purge")
    .setDescription(
      "Delete multiple messages.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages,
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription(
          "Number of messages to delete (1-100).",
        )
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
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

    const amount =
      interaction.options.getInteger(
        "amount",
        true,
      );

    const channel =
      interaction.channel;

    if (
      !channel ||
      !channel.isTextBased() ||
      !("bulkDelete" in channel)
    ) {
      await interaction.reply({
        content:
          "❌ This channel does not support bulk deletion.",
        ephemeral: true,
      });

      return;
    }

    const deleted =
      await channel.bulkDelete(
        amount,
        true,
      );

    await interaction.reply({
      content: `🗑️ Deleted **${deleted.size}** message(s).`,
      ephemeral: true,
    });
  },
};

export default command;