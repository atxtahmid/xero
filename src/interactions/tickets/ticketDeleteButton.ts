import { ButtonInteraction, TextChannel } from "discord.js";
import logger from "../../logger/logger.js";
import ticketLogService from "../../services/tickets/ticketLogService.js";
import ticketService from "../../services/tickets/ticketService.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

const deleting = new Set<string>();
const DELETE_DELAY = 5000;

export default async function ticketDeleteButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.editReply({ content: "❌ Ticket not found." });
    return;
  }

  const isStaff = isTicketStaff(interaction, ticket.panel.supportRoleId);

  if (!isStaff) {
    await interaction.editReply({ content: "❌ Permission denied." });
    return;
  }

  if (ticket.status !== "CLOSED") {
    await interaction.editReply({ content: "❌ Ticket must be closed first." });
    return;
  }

  if (deleting.has(interaction.channelId)) {
    await interaction.editReply({
      content: "⚠️ Ticket deletion is already scheduled.",
    });
    return;
  }

  deleting.add(interaction.channelId);

  await interaction.editReply({
    content: `🗑️ Ticket will be deleted in ${DELETE_DELAY / 1000} seconds...`,
  });

  await interaction.channel.send({
    content: `⚠️ Scheduled for deletion by ${interaction.user}.`,
  });

  // Logged now, before deletion, not inside the setTimeout below — once
  // the channel is actually gone there's nothing left to reference it
  // from, and the slash-command version of this action (delete.ts)
  // follows the same "log before deleting" order.
  const creator = await interaction.client.users
    .fetch(ticket.creatorId)
    .catch(() => null);

  if (creator) {
    ticketLogService
      .logDelete(interaction.guild, interaction.channelId, creator, interaction.user)
      .catch((error) => {
        logger.error("[Ticket Delete] Failed to write ticket log:", error);
      });
  }

  setTimeout(async () => {
    try {
      await ticketService.delete(interaction.channelId);
      await interaction.channel?.delete().catch(() => {});
    } catch (error) {
      logger.error("[Ticket Delete Button]", error);
    } finally {
      deleting.delete(interaction.channelId);
    }
  }, DELETE_DELAY);
}