import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
  TextChannel 
} from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/tickets/ticketService.js";
import ticketLogService from "../../services/tickets/ticketLogService.js";
import logger from "../../logger/logger.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("ticket-lock")
    .setDescription("Lock the current ticket."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    if (!(channel instanceof TextChannel)) {
      await interaction.editReply("❌ This command can only be used in a ticket text channel.");
      return;
    }

    const ticket = await ticketService.getByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.editReply("❌ This channel is not a registered ticket.");
      return;
    }

    const isStaff = isTicketStaff(interaction, ticket.panel.supportRoleId);

    if (!isStaff) {
      await interaction.editReply("❌ You do not have permission to lock tickets.");
      return;
    }
    
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
      AddReactions: false,
    });

    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: false,
    });

    try {
      await ticketService.lock(interaction.channelId);
      await interaction.editReply("✅ Ticket locked successfully.");
      await channel.send(`🔒 This ticket has been locked by ${interaction.user}.`);

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
    } catch (error: any) {
      await interaction.editReply(`❌ ${error.message}`);
    }
  },
};

export default command;
