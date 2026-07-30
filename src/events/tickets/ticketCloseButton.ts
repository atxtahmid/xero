import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

export default async function ticketCloseButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  // Set ephemeral to prevent public "is thinking" clutter
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
      content: "❌ You do not have permission to close tickets.",
    });
    return;
  }

  if (ticket.status === "CLOSED") {
    await interaction.editReply({
      content: "❌ This ticket is already closed.",
    });
    return;
  }

  // Silence participants: Deny everyone and explicitly the creator
  await interaction.channel?.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    { SendMessages: false }
  );

  await interaction.channel?.permissionOverwrites.edit(
    ticket.creatorId,
    { SendMessages: false }
  );

  await ticketService.close(interaction.channelId);

  // Define new controls for a closed ticket
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:reopen")
      .setLabel("Reopen")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("ticket:delete")
      .setLabel("Delete")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
  );

  // Edit the message to replace ALL components (clears the initial two rows)
  await interaction.message.edit({
    components: [row],
  });

  await interaction.editReply({
    content: "✅ Ticket closed successfully.",
  });

  await interaction.channel?.send({
    content: `🔴 This ticket was closed by ${interaction.user}.`,
  });
}