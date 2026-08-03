import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import ticketService from "../../services/ticketService.js";
import ticketLogService from "../../services/ticketLogService.js";
import logger from "../../services/logger.js";

export default async function ticketUnclaimButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);

  if (!ticket) {
    await interaction.editReply({ content: "❌ Ticket not found." });
    return;
  }

  if (!ticket.claimedById) {
    await interaction.editReply({ content: "❌ This ticket is not claimed." });
    return;
  }

  const isClaimer = ticket.claimedById === interaction.user.id;
  const isManager = interaction.memberPermissions?.has(
    PermissionFlagsBits.ManageChannels,
  );

  if (!isClaimer && !isManager) {
    await interaction.editReply({
      content: "❌ Only the claimer or a manager can unclaim.",
    });
    return;
  }

  try {
    await ticketService.unclaim(interaction.channelId);

    if (interaction.channel.name.startsWith("claimed-")) {
      await interaction.channel
        .setName(interaction.channel.name.replace("claimed-", ""))
        .catch(() => {});
    }

    // Swap "Unclaim" back to "Claim" on the ticket controls.
    if (interaction.message.editable) {
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
      content: "✅ Ticket unclaimed.",
    });

    await interaction.channel.send({
      content: `↩️ ${interaction.user} has unclaimed this ticket.`,
    });

    const creator = await interaction.client.users
      .fetch(ticket.creatorId)
      .catch(() => null);

    if (creator) {
      ticketLogService
        .logUnclaim(interaction.guild, interaction.channelId, creator, interaction.user)
        .catch((error) => {
          logger.error("[Ticket Unclaim] Failed to write ticket log:", error);
        });
    }
  } catch (e: any) {
    await interaction.editReply({
      content: `❌ ${e.message ?? "Failed to unclaim ticket."}`,
    });
  }
}