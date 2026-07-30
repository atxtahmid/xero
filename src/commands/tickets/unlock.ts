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
    .setName("unlock")
    .setDescription(
      "Unlock the current ticket.",
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

    if (ticket.status !== "LOCKED") {
      await interaction.reply({
        content:
          "❌ This ticket is not locked.",
        ephemeral: true,
      });

      return;
    }

    await interaction.channel?.permissionOverwrites.edit(
      ticket.creatorId,
      {
        SendMessages: true,
      },
    );

    await ticketService.unlock(
      interaction.channelId,
    );

    await interaction.reply({
      content:
        "🔓 Ticket unlocked successfully.",
    });
  },
};

export default command;