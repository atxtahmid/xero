import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeWhitelistService from "../../services/antiNukeWhitelistService.js";
import {
  Permission,
  type Command,
} from "../../types/Command.js";

const categories = [
  "ALL",

  "BAN",
  "KICK",

  "CHANNEL_CREATE",
  "CHANNEL_DELETE",
  "CHANNEL_UPDATE",

  "ROLE_CREATE",
  "ROLE_DELETE",
  "ROLE_UPDATE",

  "BOT_ADD",

  "WEBHOOK_CREATE",

  "SERVER_UPDATE",
];

const command: Command = {
  permissions: [
    Permission.ANTINUKE,
  ],

  guildOnly: true,

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("whitelist-add")
    .setDescription(
      "Add a user to the Anti-Nuke whitelist.",
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to whitelist")
        .setRequired(true),
    )
    .addStringOption((option) => {
      option
        .setName("category")
        .setDescription(
          "Whitelist category",
        )
        .setRequired(true);

      for (const category of categories) {
        option.addChoices({
          name: category,
          value: category,
        });
      }

      return option;
    }),

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

    const category =
      interaction.options.getString(
        "category",
        true,
      );

    await antiNukeWhitelistService.add(
      interaction.guild.id,
      user.id,
      category,
    );

    await interaction.reply({
      content:
        `✅ **${user.tag}** has been whitelisted for **${category}**.`,
      ephemeral: true,
    });
  },
};

export default command;