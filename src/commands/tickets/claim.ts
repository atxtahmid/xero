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
  permissions: [], // Added missing property

  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Claim the current ticket."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    
    // Narrowing: permissionOverwrites and setName are only on TextChannel/VoiceChannel
    if (!(channel instanceof TextChannel)) {
      await interaction.editReply("❌ This command can only be used in a ticket text channel.");
      return;
    }

    const ticket = await ticketService.getByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.editReply("❌ This channel is not a registered ticket.");
      return;
    }

    // Permission Check: ManageChannels OR having the Support Role
    const isStaff = 
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

    if (!isStaff) {
      await interaction.editReply("❌ You do not have permission to claim this ticket.");
      return;
    }

    try {
      await ticketService.claim(interaction.channelId, interaction.user.id);
      
      // Attempt rename, ignore if rate limited
      if (!channel.name.startsWith("claimed-")) {
        await channel.setName(`claimed-${channel.name}`).catch(() => {});
      }

      await interaction.editReply("✅ You have claimed this ticket.");
      await channel.send(`🙋 ${interaction.user} has claimed this ticket.`);
    } catch (error: any) {
      await interaction.editReply(`❌ ${error.message}`);
    }
  },
};

export default command;