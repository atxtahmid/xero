import { ButtonInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketLockButton(interaction: ButtonInteraction): Promise<void> {
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

  await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
  await interaction.channel.permissionOverwrites.edit(ticket.creatorId, { SendMessages: false });

  try {
    await ticketService.lock(interaction.channelId);
    await interaction.editReply({ content: "✅ Ticket locked." });
    await interaction.channel.send({ content: `🔒 Locked by ${interaction.user}.` });
  } catch (e: any) {
    await interaction.editReply({ content: `❌ ${e.message}` });
  }
}