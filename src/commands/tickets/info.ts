import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("View information about the current ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply({
        content: "❌ This channel is not a registered ticket.",
      });
      return;
    }

    // Permission Check: ManageChannels OR Support Role
    const isStaff = isTicketStaff(interaction, ticket.panel.supportRoleId);

    if (!isStaff) {
      await interaction.editReply({
        content: "❌ You do not have permission to view ticket information.",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(ticket.panel.color || 0x5865f2)
      .setTitle("🎫 Ticket Information")
      .setDescription(`Detailed metadata for ticket \`${ticket.id}\``)
      .addFields(
        {
          name: "👤 Owner",
          value: `<@${ticket.creatorId}>\n(\`${ticket.creatorId}\`)`,
          inline: true,
        },
        {
          name: "📌 Status",
          value: `\`${ticket.status}\``,
          inline: true,
        },
        {
          name: "📂 Panel",
          value: ticket.panel.name || "Default",
          inline: true,
        },
        {
          name: "🙋 Claimed By",
          value: ticket.claimedById ? `<@${ticket.claimedById}>` : "Not Claimed",
          inline: true,
        },
        {
          name: "🗓️ Created",
          value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`,
          inline: false,
        }
      );

    if (ticket.closedAt) {
      embed.addFields({
        name: "🔒 Closed At",
        value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:F>`,
        inline: false,
      });
    }

    if (ticket.panel.logChannelId) {
      embed.addFields({
        name: "📜 Log Channel",
        value: `<#${ticket.panel.logChannelId}>`,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;