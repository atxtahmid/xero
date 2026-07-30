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
    .setName("unclaim")
    .setDescription("Unclaim the current ticket."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    if (!(channel instanceof TextChannel)) {
      await interaction.editReply("❌ This command can only be used in a ticket text channel.");
      return;
    }

    const ticket = await ticketService.getByChannel(interaction.channelId);
    if (!ticket || !ticket.claimedById) {
      await interaction.editReply("❌ This ticket is not currently claimed.");
      return;
    }

    const isClaimer = ticket.claimedById === interaction.user.id;
    const isManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

    if (!isClaimer && !isManager) {
      await interaction.editReply("❌ Only the person who claimed this ticket (or a Manager) can unclaim it.");
      return;
    }

    await ticketService.unclaim(interaction.channelId);

    // Remove claimed prefix
    if (channel.name.startsWith("claimed-")) {
      const newName = channel.name.replace(/^claimed-/, "");
      await channel.setName(newName).catch(() => {});
    }

    await interaction.editReply("✅ You have unclaimed this ticket.");
    await channel.send(`↩️ ${interaction.user} has unclaimed this ticket.`);
  },
};

export default command;