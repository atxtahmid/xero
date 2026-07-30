import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription(
      "Lock the current ticket.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
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

    if (ticket.status === "LOCKED") {
      await interaction.reply({
        content:
          "❌ This ticket is already locked.",
        ephemeral: true,
      });

      return;
    }

    await interaction.channel?.permissionOverwrites.edit(
      ticket.creatorId,
      {
        SendMessages: false,
      },
    );

    await ticketService.lock(
      interaction.channelId,
    );

    await interaction.reply({
      content:
        "🔒 Ticket locked successfully.",
    });
  },
};

export default command;