import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: false,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Technical details and bot statistics."),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client;
    
    // Dynamic Stats
    const serverCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    const embed = new EmbedBuilder()
      .setTitle("❄️ About Xero")
      .setDescription("Xero is a high-performance, security-focused Discord utility built for the XERO-IQ server and Discord server ecosystem.")
      .addFields(
        {
          name: "⚙️ Core Architecture",
          value: [
            "• **Runtime**: Node.js 22 (LTS)",
            "• **Framework**: Discord.js v14",
            "• **Database**: PostgreSQL + Prisma",
            "• **Engine**: Google Gemini",
          ].join("\n"),
          inline: false
        },
        {
          name: "📊 Statistics",
          value: [
            `• **Servers**: ${serverCount}`,
            `• **Users**: ~${userCount.toLocaleString()}`,
          ].join("\n"),
          inline: true
        },
        {
          name: "📍 Status",
          value: "• **Phase**: FINAL (Production)\n• **Environment**: XI-DATABASE",
          inline: true
        }
      )
      .setColor(0x2ecc71)
      .setTimestamp()
      .setFooter({ text: "Developed by @.xr1c" });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;