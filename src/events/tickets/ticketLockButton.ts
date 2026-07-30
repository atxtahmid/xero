import {
  ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

export default async function ticketLockButton(
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
      content: "❌ You do not have permission to lock tickets.",
    });
    return;
  }

  if (ticket.status === "LOCKED") {
    await interaction.editReply({
      content: "❌ This ticket is already locked.",
    });
    return;
  }

  // To properly lock a ticket, we deny SendMessages to @everyone.
  // Staff usually have a specific 'Allow' overwrite from ticket creation, so they stay unlocked.
  // This also silences users added via /add who aren't the creator.
  await interaction.channel?.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    {
      SendMessages: false,
      AddReactions: false,
    },
  );

  // Ensure the creator is also explicitly denied in case they have a personal override
  await interaction.channel?.permissionOverwrites.edit(
    ticket.creatorId,
    {
      SendMessages: false,
    },
  );

  await ticketService.lock(interaction.channelId);

  await interaction.editReply({
    content: "✅ Ticket locked successfully.",
  });

  await interaction.channel?.send({
    content: `🔒 This ticket has been locked by ${interaction.user}.`,
  });
}