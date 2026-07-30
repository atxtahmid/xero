import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      return;
    }

    const ticket =
      await ticketService.getByChannel(
        interaction.channelId,
      );

    if (!ticket) {
      await interaction.reply({
        content:
          "❌ This channel is not a ticket.",
        ephemeral: true,
      });

      return;
    }

    if (ticket.status === "CLOSED") {
      await interaction.reply({
        content:
          "❌ This ticket is already closed.",
        ephemeral: true,
      });

      return;
    }

    await ticketService.close(
      interaction.channelId,
    );

    await interaction.reply({
      content:
        "🔒 Ticket closed successfully.",
    });
  },
};

export default command;