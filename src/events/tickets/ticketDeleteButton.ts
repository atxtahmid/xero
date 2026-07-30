import { ButtonInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";

const deleting = new Set<string>();

export default async function ticketDeleteButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);
  if (!ticket) return;

  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({ content: "❌ Permission denied." });
    return;
  }

  if (ticket.status !== "CLOSED") {
    await interaction.editReply({ content: "❌ Ticket must be closed first." });
    return;
  }

  if (deleting.has(interaction.channelId)) return;
  deleting.add(interaction.channelId);

  await interaction.editReply({ content: "🗑️ Deleting in 5 seconds..." });
  await interaction.channel.send({ content: `⚠️ Scheduled for deletion by ${interaction.user}.` });

  setTimeout(async () => {
    try {
      await ticketService.delete(interaction.channelId);
      await interaction.channel?.delete().catch(() => {});
    } catch (e) {
      deleting.delete(interaction.channelId);
    }
  }, 5000);
}