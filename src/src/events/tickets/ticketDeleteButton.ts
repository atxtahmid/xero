import {
  ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

// Simple local set to prevent multiple deletion timers in the same process
const deletingChannels = new Set<string>();

export default async function ticketDeleteButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);

  if (!ticket) {
    await interaction.editReply({
      content: "❌ This channel is not a registered ticket.",
    });
    return;
  }

  // Permission: ManageChannels OR having the Support Role
  const isStaff = 
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({
      content: "❌ You do not have permission to delete tickets.",
    });
    return;
  }

  // State Check: Only allow deletion of CLOSED tickets to ensure transcript cycle
  if (ticket.status !== "CLOSED") {
    await interaction.editReply({
      content: "❌ This ticket must be **Closed** before it can be deleted.",
    });
    return;
  }

  if (deletingChannels.has(interaction.channelId)) {
    await interaction.editReply({
      content: "⚠️ Deletion process is already in progress.",
    });
    return;
  }

  deletingChannels.add(interaction.channelId);

  await interaction.editReply({
    content: "🗑️ Ticket record deleted. Channel will be removed in 5 seconds...",
  });

  // Public countdown notice
  await interaction.channel?.send({
    content: `⚠️ This ticket has been scheduled for deletion by ${interaction.user}.`,
  });

  setTimeout(async () => {
    try {
      // 1. Remove from database first
      await ticketService.delete(interaction.channelId);

      // 2. Finally, delete the Discord channel
      await interaction.channel?.delete("Ticket deletion request.");
    } catch (error) {
      console.error("[Ticket] Final deletion failed:", error);
      deletingChannels.delete(interaction.channelId);
    }
  }, 5000);
}