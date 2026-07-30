import { ButtonInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketUnclaimButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);
  if (!ticket || !ticket.claimedById) {
    await interaction.editReply({ content: "❌ This ticket is not claimed." });
    return;
  }

  const isClaimer = ticket.claimedById === interaction.user.id;
  const isManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

  if (!isClaimer && !isManager) {
    await interaction.editReply({ content: "❌ Only the claimer or a manager can unclaim." });
    return;
  }

  await ticketService.unclaim(interaction.channelId);

  if (interaction.channel.name.startsWith("claimed-")) {
    await interaction.channel.setName(interaction.channel.name.replace("claimed-", "")).catch(() => {});
  }

  await interaction.editReply({ content: "✅ Ticket unclaimed." });
  await interaction.channel.send({ content: `↩️ ${interaction.user} has unclaimed this ticket.` });
}