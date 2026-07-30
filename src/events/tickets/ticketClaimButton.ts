import { ButtonInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketClaimButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.editReply({ content: "❌ Not a registered ticket." });
    return;
  }

  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({ content: "❌ You do not have permission to claim this ticket." });
    return;
  }

  if (ticket.claimedById) {
    await interaction.editReply({ content: `❌ Already claimed by <@${ticket.claimedById}>.` });
    return;
  }

  try {
    await ticketService.claim(interaction.channelId, interaction.user.id);
    if (!interaction.channel.name.startsWith("claimed-")) {
      await interaction.channel.setName(`claimed-${interaction.channel.name}`).catch(() => {});
    }
    await interaction.editReply({ content: "✅ Ticket claimed." });
    await interaction.channel.send({ content: `🙋 ${interaction.user} has claimed this ticket.` });
  } catch (error: any) {
    await interaction.editReply({ content: `❌ ${error.message}` });
  }
}