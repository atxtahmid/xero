import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import logger from "../../logger/logger.js";
import ticketLogService from "../../services/tickets/ticketLogService.js";
import ticketService from "../../services/tickets/ticketService.js";
import type { Command } from "../../types/Command.js";

const DELETE_DELAY = 5000;

const command: Command = {
  guildOnly: true,
  cooldown: 10,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete the current ticket."),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const { guild, channel } = interaction;

    if (!guild || !(channel instanceof TextChannel)) {
      await interaction.reply({
        content:
          "❌ This command can only be used inside a ticket channel.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    const ticket = await ticketService.getByChannel(
      interaction.channelId,
    );

    if (!ticket) {
      await interaction.editReply({
        content:
          "❌ This channel is not a registered ticket.",
      });
      return;
    }

    // Fetch a real GuildMember to avoid union type issues
    const member = await guild.members
      .fetch(interaction.user.id)
      .catch(() => null);

    if (!member) {
      await interaction.editReply({
        content:
          "❌ Unable to verify your permissions.",
      });
      return;
    }

    const isSupport =
      !!ticket.panel.supportRoleId &&
      member.roles.cache.has(
        ticket.panel.supportRoleId,
      );

    const isStaff =
      interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageChannels,
      ) || isSupport;

    if (!isStaff) {
      await interaction.editReply({
        content:
          "❌ You do not have permission to delete tickets.",
      });
      return;
    }

    if (ticket.status !== "CLOSED") {
      await interaction.editReply({
        content:
          "❌ This ticket must be **closed** before it can be deleted.",
      });
      return;
    }

    await interaction.editReply({
      content:
        "🗑️ Ticket record deleted.\nThis channel will be removed in **5 seconds**.",
    });

    await channel.send({
      content: `⚠️ This ticket will be deleted by ${interaction.user}.`,
    });

    // Log before deleting
    try {
      await ticketLogService.logDelete(
        guild,
        channel.id,
        // The Ticket model has no `userId` field — the ticket creator is
        // `creatorId` (see prisma/schema.prisma and every other ticket
        // file). This was the one place still using the wrong name.
        await guild.client.users.fetch(ticket.creatorId),
        interaction.user,
      );
    } catch (error) {
      logger.warn(
        "[Ticket Delete] Failed to write ticket log.",
        error,
      );
    }

    setTimeout(async () => {
      try {
        await ticketService.delete(channel.id);

        await channel.delete(
          "Ticket deleted via command.",
        );
      } catch (error) {
        logger.error(
          "[Ticket Delete]",
          error,
        );
      }
    }, DELETE_DELAY);
  },
};

export default command;
