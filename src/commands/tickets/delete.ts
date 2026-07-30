import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 10,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete the current ticket."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const { guild, channel } = interaction;

    // FIX: Narrowing the channel type to allow .send()
    if (!guild || !(channel instanceof TextChannel)) {
      await interaction.reply({ 
        content: "❌ This command can only be used in a ticket text channel.", 
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply({ content: "❌ This channel is not a registered ticket." });
      return;
    }

    // Permission Check: ManageChannels OR Support Role
    const isStaff = 
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

    if (!isStaff) {
      await interaction.editReply({ content: "❌ You do not have permission to delete tickets." });
      return;
    }

    // State Check: Require closing first to ensure the end-of-life cycle
    if (ticket.status !== "CLOSED") {
      await interaction.editReply({ content: "❌ This ticket must be **Closed** before it can be deleted." });
      return;
    }

    await interaction.editReply({
      content: "🗑️ Ticket record deleted. Channel will be removed in 5 seconds...",
    });

    await channel.send({
      content: `⚠️ This ticket has been scheduled for deletion by ${interaction.user} via command.`,
    });

    setTimeout(async () => {
      try {
        await ticketService.delete(interaction.channelId);
        await channel.delete("Ticket deletion command.");
      } catch (error) {
        console.error("[Ticket Delete Command] Error:", error);
      }
    }, 5000);
  },
};

export default command;