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

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription(
      "Unban a user from the server.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers,
    )
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription(
          "User ID to unban.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(
          "Reason for the unban.",
        )
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

    const userId =
      interaction.options.getString(
        "user",
        true,
      );

    const reason =
      interaction.options.getString(
        "reason",
      ) ?? "No reason provided.";

    try {
      await interaction.guild.bans.fetch(
        userId,
      );
    } catch {
      await interaction.reply({
        content:
          "❌ That user is not banned.",
        ephemeral: true,
      });

      return;
    }

    await interaction.guild.bans.remove(
      userId,
      reason,
    );

    await interaction.reply({
      content: `✅ User \`${userId}\` has been unbanned.\n**Reason:** ${reason}`,
    });
  },
};

export default command;