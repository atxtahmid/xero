import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import ticketService from "../../services/tickets/ticketService.js";
import ticketLogService from "../../services/tickets/ticketLogService.js";
import logger from "../../logger/logger.js";

export default async function ticketClaimButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);

  if (!ticket) {
    await interaction.editReply({
      content: "❌ Not a registered ticket.",
    });
    return;
  }

  // Important: Only open tickets can be claimed
  if (ticket.status !== "OPEN") {
    await interaction.editReply({
      content: "❌ Only open tickets can be claimed.",
    });
    return;
  }

  const member = interaction.guild.members.cache.get(interaction.user.id);

  const isStaff =
    interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageChannels,
    ) ||
    (ticket.panel.supportRoleId &&
      member?.roles.cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({
      content: "❌ You do not have permission to claim this ticket.",
    });
    return;
  }

  if (ticket.claimedById) {
    await interaction.editReply({
      content: `❌ Already claimed by <@${ticket.claimedById}>.`,
    });
    return;
  }

  try {
    await ticketService.claim(interaction.channelId, interaction.user.id);

    if (!interaction.channel.name.startsWith("claimed-")) {
      await interaction.channel
        .setName(`claimed-${interaction.channel.name}`)
        .catch(() => {});
    }

    // Swap "Claim" for "Unclaim" on the ticket controls so the ticket
    // can actually be unclaimed again. Without this, "ticket:unclaim"
    // was a customId nothing in the UI ever produced, so the unclaim
    // handler was unreachable no matter who clicked what.
    if (interaction.message.editable) {
      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket:unclaim")
          .setLabel("Unclaim")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary),
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
          .setStyle(ButtonStyle.Danger),
      );

      const danger = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket:delete")
          .setLabel("Delete")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

      await interaction.message
        .edit({ components: [controls, danger] })
        .catch(() => {});
    }

    await interaction.editReply({
      content: "✅ Ticket claimed.",
    });

    await interaction.channel.send({
      content: `🙋 ${interaction.user} has claimed this ticket.`,
    });

    const creator = await interaction.client.users
      .fetch(ticket.creatorId)
      .catch(() => null);

    if (creator) {
      ticketLogService
        .logClaim(interaction.guild, interaction.channelId, creator, interaction.user)
        .catch((error) => {
          logger.error("[Ticket Claim] Failed to write ticket log:", error);
        });
    }
  } catch (error) {
    logger.error("[Ticket Claim Button]", error);

    await interaction.editReply({
      content: "❌ Failed to claim the ticket.",
    });
  }
}
