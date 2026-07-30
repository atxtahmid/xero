import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],
  data: new SlashCommandBuilder().setName("reopen").setDescription("Reopen a closed ticket."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({ content: "❌ Invalid channel type.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const ticket = await ticketService.getByChannel(interaction.channelId);

    if (!ticket || ticket.status !== "CLOSED") {
      await interaction.editReply("❌ Ticket is not closed.");
      return;
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    await channel.permissionOverwrites.edit(ticket.creatorId, { SendMessages: true, ViewChannel: true });

    await ticketService.reopen(interaction.channelId);
    await interaction.editReply("✅ Ticket reopened.");
    await channel.send(`🔓 Ticket reopened by ${interaction.user}.`);
  },
};
export default command;