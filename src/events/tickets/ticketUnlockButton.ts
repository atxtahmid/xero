import { ButtonInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketUnlockButton(interaction: ButtonInteraction): Promise<void> {
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

  await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
  await interaction.channel.permissionOverwrites.edit(ticket.creatorId, { SendMessages: true });

  try {
    await ticketService.unlock(interaction.channelId);
    await interaction.editReply({ content: "✅ Ticket unlocked." });
    await interaction.channel.send({ content: `🔓 Unlocked by ${interaction.user}.` });
  } catch (e: any) {
    await interaction.editReply({ content: `❌ ${e.message}` });
  }
}