import {
  ChatInputCommandInteraction,
  EmbedBuilder,
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
    .setName("whitelist-list")
    .setDescription(
      "View the Anti-Nuke whitelist.",
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

    const entries =
      await antiNukeWhitelistService.list(
        interaction.guild.id,
      );

    if (entries.length === 0) {
      await interaction.reply({
        content:
          "📄 The Anti-Nuke whitelist is empty.",
        ephemeral: true,
      });

      return;
    }

    const grouped = new Map<
      string,
      string[]
    >();

    for (const entry of entries) {
      const list =
        grouped.get(entry.userId) ?? [];

      list.push(entry.category);

      grouped.set(entry.userId, list);
    }

    const embed = new EmbedBuilder()
      .setTitle(
        "🛡️ Anti-Nuke Whitelist",
      )
      .setColor(0x57f287);

    for (const [
      userId,
      categories,
    ] of grouped) {
      embed.addFields({
        name: `<@${userId}>`,
        value: categories.join(", "),
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};

export default command;