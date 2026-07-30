import {
  ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

export default async function ticketClaimButton(
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

  // Permission check: ManageChannels OR having the Support Role
  const isStaff = 
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({
      content: "❌ You do not have permission to claim this ticket.",
    });
    return;
  }

  if (ticket.claimedById) {
    const claimer = ticket.claimedById === interaction.user.id ? "you" : `<@${ticket.claimedById}>`;
    await interaction.editReply({
      content: `❌ This ticket is already claimed by ${claimer}.`,
    });
    return;
  }

  // Update DB
  await ticketService.claim(
    interaction.channelId,
    interaction.user.id,
  );

  // Visual Update
  const channel = interaction.channel;
  if (channel?.isTextBased() && "setName" in channel) {
    try {
      // Avoid prefixing if already prefixed (handles race conditions visually)
      if (!channel.name.startsWith("claimed-")) {
        await (channel as any).setName(`claimed-${channel.name}`);
      }
    } catch (error) {
      // Silent catch for Discord Rate Limits (2 per 10 mins)
      console.warn(`[Ticket] Rename failed (Rate Limit): ${channel.id}`);
    }
  }

  await interaction.editReply({
    content: `✅ You have claimed this ticket.`,
  });

  // Public notification
  await channel?.send({
    content: `🙋 ${interaction.user} has claimed this ticket.`,
  });
}