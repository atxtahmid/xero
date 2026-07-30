import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
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

    const commands = interaction.client.commands;
    const categories: Record<string, string[]> = {};

    // Group and filter commands dynamically
    for (const [name, cmd] of commands) {
      // Security Check: Can this specific user actually run this command?
      const allowed = await hasPermission(interaction, cmd.permissions);
      if (!allowed) continue;

      // Extract category from permissions or logic
      let category = "General";
      if (cmd.permissions.includes(Permission.MODERATOR)) category = "Moderation";
      if (cmd.permissions.includes(Permission.ADMIN)) category = "Admin";
      if (cmd.permissions.includes(Permission.ANTINUKE)) category = "Security";
      if (cmd.permissions.includes(Permission.SERVER_OWNER)) category = "Owner";

      if (!categories[category]) categories[category] = [];
      categories[category].push(`\`/${name}\``);
    }

    const embed = new EmbedBuilder()
      .setTitle("📖 Xero Command Directory")
      .setColor(0x57f287)
      .setDescription("Here are the commands you currently have access to use:")
      .setTimestamp()
      .setFooter({ text: "Xero Security & Support" });

    for (const [category, cmds] of Object.entries(categories)) {
      embed.addFields({
        name: category,
        value: cmds.sort().join(", "),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;