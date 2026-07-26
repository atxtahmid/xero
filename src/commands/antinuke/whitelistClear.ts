import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeWhitelistService from "../../services/antiNukeWhitelistService.js";
import {
  Permission,
  type Command,
} from "../../types/Command.js";

const command: Command = {
  permissions: [
    Permission.ANTINUKE,
  ],

  guildOnly: true,

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("whitelist-clear")
    .setDescription(
      "Remove every Anti-Nuke whitelist entry for a user.",
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to clear")
        .setRequired(true),
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

    const user =
      interaction.options.getUser(
        "user",
        true,
      );

    await antiNukeWhitelistService.clear(
      interaction.guild.id,
      user.id,
    );

    await interaction.reply({
      content: `✅ Removed every whitelist permission from **${user.tag}**.`,
      ephemeral: true,
    });
  },
};

export default command;