import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the list of available commands."),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("📖 Xero Help")
      .setDescription("Here are the currently available commands:")
      .addFields(
        {
          name: "/ping",
          value: "Check the bot's latency.",
          inline: false,
        },
        {
          name: "/help",
          value: "Display this help menu.",
          inline: false,
        },
        {
          name: "/about",
          value: "Learn more about Xero.",
          inline: false,
        }
      )
      .setColor(0x57f287)
      .setTimestamp()
      .setFooter({
        text: "Xero • Phase 1",
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};

export default command;