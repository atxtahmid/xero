import {
  ButtonInteraction,
  TextChannel,
} from "discord.js";
import ticketService from "../../services/tickets/ticketService.js";
import ticketLogService from "../../services/tickets/ticketLogService.js";
import logger from "../../logger/logger.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

export default async function ticketUnlockButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);

  if (!ticket) {
    await interaction.editReply({
      content: "❌ Ticket not found.",
    });
    return;
  }

  if (ticket.status !== "LOCKED") {
    await interaction.editReply({
      content: "❌ Ticket is not locked.",
    });
    return;
  }

  const isStaff = isTicketStaff(interaction, ticket.panel.supportRoleId);

  if (!isStaff) {
    await interaction.editReply({
      content: "❌ Permission denied.",
    });
    return;
  }

  try {
    await ticketService.unlock(interaction.channelId);

    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: null },
    );

    await interaction.channel.permissionOverwrites.edit(
      ticket.creatorId,
      { SendMessages: true },
    );

    await interaction.editReply({
      content: "✅ Ticket unlocked.",
    });

    await interaction.channel.send({
      content: `🔓 Unlocked by ${interaction.user}.`,
    });

    const creator = await interaction.client.users
      .fetch(ticket.creatorId)
      .catch(() => null);

    if (creator) {
      ticketLogService
        .logUnlock(interaction.guild, interaction.channelId, creator, interaction.user)
        .catch((error) => {
          logger.error("[Ticket Unlock] Failed to write ticket log:", error);
        });
    }
  } catch (e: any) {
    await interaction.editReply({
      content: `❌ ${e.message}`,
    });
  }
}