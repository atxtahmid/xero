import {
  ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

export default async function ticketUnlockButton(
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
      content: "❌ You do not have permission to unlock tickets.",
    });
    return;
  }

  if (ticket.status !== "LOCKED") {
    await interaction.editReply({
      content: "❌ This ticket is not locked.",
    });
    return;
  }

  // Reset @everyone to inherit (re-enabling users added via /add)
  await interaction.channel?.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    {
      SendMessages: null,
      AddReactions: null,
    },
  );

  // Explicitly restore creator permissions
  await interaction.channel?.permissionOverwrites.edit(
    ticket.creatorId,
    {
      SendMessages: true,
      AddReactions: true,
    },
  );

  await ticketService.unlock(interaction.channelId);

  await interaction.editReply({
    content: "✅ Ticket unlocked successfully.",
  });

  await interaction.channel?.send({
    content: `🔓 This ticket has been unlocked by ${interaction.user}.`,
  });
}