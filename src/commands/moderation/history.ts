import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../database/prisma.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("View a member's full moderation history.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to view.")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const user = interaction.options.getUser("user", true);

    // Fetch the 10 most recent cases (Bans, Kicks, Timeouts)
    const cases = await db.case.findMany({
      where: { guildId: interaction.guild.id, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Fetch the 10 most recent warnings
    const warnings = await db.warning.findMany({
      where: { guildId: interaction.guild.id, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Combine and sort by date
    const combined = [
      ...cases.map((c) => ({ ...c, type: c.action })),
      ...warnings.map((w) => ({ ...w, type: "WARN" })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: `${user.tag}'s Moderation History`,
        iconURL: user.displayAvatarURL(),
      })
      .setTimestamp();

    if (combined.length === 0) {
      embed.setDescription("✅ No moderation history found for this user.");
    } else {
      const historyList = combined.map((entry, index) => {
        const date = `<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`;
        return `**${index + 1}. [${entry.type}]**\nReason: ${entry.reason}\nBy: <@${entry.moderatorId}>\nDate: ${date}`;
      });

      embed.setDescription(historyList.join("\n\n"));
      embed.setFooter({ text: "Showing last 10 actions (Warnings & Cases)" });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;