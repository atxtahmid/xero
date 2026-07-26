import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

const command: Command = {
  permissions: [
    Permission.USER,
  ],

  guildOnly: false,

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Learn more about Xero."),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    const embed = new EmbedBuilder()
      .setTitle("❄️ About Xero")
      .setDescription(
        "Xero is a modern all-in-one Discord bot built with a focus on performance, scalability, and a clean architecture.",
      )
      .addFields(
        {
          name: "⚙️ Tech Stack",
          value: [
            "• TypeScript",
            "• Node.js 22",
            "• discord.js v14",
            "• PostgreSQL + Prisma",
            "• Google Gemini AI",
            "• Brave Search API",
            "• Lavalink Music",
            "• Docker",
          ].join("\n"),
        },
        {
          name: "📍 Current Phase",
          value: "Phase 1 — Core Bot",
          inline: true,
        },
        {
          name: "🚀 Status",
          value: "Development",
          inline: true,
        },
      )
      .setColor(0x2ecc71)
      .setTimestamp()
      .setFooter({
        text: "Xero",
      });

    await interaction.reply({
      embeds: [embed],
    });
  },
};

export default command;