import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";
import { hasPermission } from "../../utils/permissions.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: false,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View available commands tailored to your permissions."),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const categories: Record<string, string[]> = {};

    for (const [name, cmd] of interaction.client.commands) {
      const allowed = await hasPermission(
        interaction,
        [...cmd.permissions], // Fixed readonly -> mutable array
      );

      if (!allowed) continue;

      let category = "General";

      if (cmd.permissions.includes(Permission.SERVER_OWNER)) {
        category = "Owner";
      } else if (cmd.permissions.includes(Permission.ANTINUKE)) {
        category = "Security";
      } else if (cmd.permissions.includes(Permission.ADMIN)) {
        category = "Admin";
      } else if (cmd.permissions.includes(Permission.MODERATOR)) {
        category = "Moderation";
      }

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(`/${name}`);
    }

    const embed = new EmbedBuilder()
      .setTitle("📖 Xero Command Directory")
      .setColor(0x57f287)
      .setDescription(
        "Here are the commands you currently have access to use.",
      )
      .setTimestamp()
      .setFooter({
        text: "Xero Security & Support",
      });

    for (const category of Object.keys(categories).sort()) {
      embed.addFields({
        name: category,
        value: categories[category].sort().join(", "),
        inline: false,
      });
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default command;