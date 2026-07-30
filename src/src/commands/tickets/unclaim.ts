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
    .setName("unclaim")
    .setDescription(
      "Unclaim the current ticket.",
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

    if (!ticket.claimedById) {
      await interaction.reply({
        content:
          "❌ This ticket is not currently claimed.",
        ephemeral: true,
      });

      return;
    }

    await ticketService.unclaim(
      interaction.channelId,
    );

    await interaction.reply({
      content:
        `✅ ${interaction.user} unclaimed this ticket.`,
    });
  },
};

export default command;