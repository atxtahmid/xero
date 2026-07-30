import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, PermissionFlagsBits, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketCloseButton(interaction: ButtonInteraction): Promise<void> {
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

  await ticketService.close(interaction.channelId);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:reopen").setLabel("Reopen").setEmoji("🔓").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ticket:delete").setLabel("Delete").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  await interaction.message.edit({ components: [row] });
  await interaction.editReply({ content: "✅ Ticket closed." });
  await interaction.channel.send({ content: `🔴 Closed by ${interaction.user}.` });
}