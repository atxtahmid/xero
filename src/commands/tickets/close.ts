import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
  TextChannel 
} from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket."),

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
      await interaction.editReply("❌ You do not have permission to close tickets.");
      return;
    }

    // Silence participants
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
    });

    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: false,
    });

    try {
      await ticketService.close(interaction.channelId);
      await interaction.editReply("✅ Ticket closed successfully.");
      await channel.send(`🔴 This ticket was closed by ${interaction.user}.`);
    } catch (error: any) {
      await interaction.editReply(`❌ ${error.message}`);
    }
  },
};

export default command;