import { ButtonInteraction, TextChannel } from "discord.js";
import ticketService from "../../services/ticketService.js";
import ticketLogService from "../../services/ticketLogService.js";
import logger from "../../services/logger.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

export default async function ticketLockButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.editReply({ content: "❌ Ticket not found." });
    return;
  }

  const isStaff = isTicketStaff(interaction, ticket.panel.supportRoleId);

  if (!isStaff) {
    await interaction.editReply({ content: "❌ Permission denied." });
    return;
  }

  if (ticket.status === "LOCKED") {
    await interaction.editReply({ content: "❌ Ticket is already locked." });
    return;
  }

  try {
    await ticketService.lock(interaction.channelId);

    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: false }
    );

    await interaction.channel.permissionOverwrites.edit(
      ticket.creatorId,
      { SendMessages: false }
    );

    await interaction.editReply({ content: "✅ Ticket locked." });

    await interaction.channel.send({
      content: `🔒 Locked by ${interaction.user}.`,
    });

    const creator = await interaction.client.users
      .fetch(ticket.creatorId)
      .catch(() => null);

    if (creator) {
      ticketLogService
        .logLock(interaction.guild, interaction.channelId, creator, interaction.user)
        .catch((error) => {
          logger.error("[Ticket Lock] Failed to write ticket log:", error);
        });
    }
  } catch (e: any) {
    await interaction.editReply({
      content: `❌ ${e.message}`,
    });
  }
}