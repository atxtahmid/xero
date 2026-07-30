import { 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  SlashCommandBuilder,
  TextChannel 
} from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current ticket."),

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

    const isStaff = 
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

    if (!isStaff) {
      await interaction.editReply("❌ You do not have permission to unlock tickets.");
      return;
    }

    // Reset @everyone and restore creator
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null,
      AddReactions: null,
    });

    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: true,
      AddReactions: true,
    });

    try {
      await ticketService.unlock(interaction.channelId);
      await interaction.editReply("✅ Ticket unlocked successfully.");
      await channel.send(`🔓 This ticket has been unlocked by ${interaction.user}.`);
    } catch (error: any) {
      await interaction.editReply(`❌ ${error.message}`);
    }
  },
};

export default command;