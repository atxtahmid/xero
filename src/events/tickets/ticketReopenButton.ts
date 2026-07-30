import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

export default async function ticketReopenButton(
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
      content: "❌ You do not have permission to reopen tickets.",
    });
    return;
  }

  if (ticket.status !== "CLOSED") {
    await interaction.editReply({
      content: "❌ This ticket is not closed.",
    });
    return;
  }

  // Reset @everyone (clears the block from the Close/Lock action)
  await interaction.channel?.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    { SendMessages: null, AddReactions: null }
  );

  // Restore creator permissions
  await interaction.channel?.permissionOverwrites.edit(
    ticket.creatorId,
    { SendMessages: true, ViewChannel: true }
  );

  // DB Update (Service also handles unclaiming)
  await ticketService.reopen(interaction.channelId);

  // Fix Channel Name (remove claimed- prefix)
  const channel = interaction.channel;
  if (channel?.isTextBased() && "setName" in channel) {
    try {
      if (channel.name.startsWith("claimed-")) {
        const originalName = channel.name.replace(/^claimed-/, "");
        await (channel as any).setName(originalName);
      }
    } catch {
      // Ignore rename rate limits
    }
  }

  // Restore Original UI Buttons
  const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:claim")
      .setLabel("Claim")
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("ticket:lock")
      .setLabel("Lock")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket:unlock")
      .setLabel("Unlock")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Close")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Danger)
  );

  const danger = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:delete")
      .setLabel("Delete")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.message.edit({
    components: [controls, danger],
  });

  await interaction.editReply({
    content: "✅ Ticket has been reopened.",
  });

  await interaction.channel?.send({
    content: `🔓 This ticket has been reopened by ${interaction.user}.`,
  });
}