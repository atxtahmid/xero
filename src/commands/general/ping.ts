import {
  ChatInputCommandInteraction,
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
    .setName("ping")
    .setDescription("Check the bot's latency."),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    const sent = await interaction.reply({
      content: "🏓 Pinging...",
      fetchReply: true,
    });

    const apiLatency = Math.round(
      interaction.client.ws.ping,
    );

    const botLatency =
      sent.createdTimestamp -
      interaction.createdTimestamp;

    await interaction.editReply({
      content: [
        "🏓 **Pong!**",
        "",
        `**Bot Latency:** ${botLatency}ms`,
        `**API Latency:** ${apiLatency}ms`,
      ].join("\n"),
    });
  },
};

export default command;