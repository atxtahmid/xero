import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/tickets/ticketService.js";
import { isTicketStaff } from "../../utils/ticketPermissions.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a user to the current ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to add.")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;

    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply({ content: "❌ This channel is not a registered ticket." });
      return;
    }

    // Permission Check: ManageChannels OR Support Role
    const isStaff = isTicketStaff(interaction, ticket.panel.supportRoleId);

    if (!isStaff) {
      await interaction.editReply({ content: "❌ You do not have permission to manage this ticket." });
      return;
    }

    // Bot Permission Check
    const me = interaction.guild.members.me;
    if (!me?.permissionsIn(interaction.channel as any).has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply({ content: "❌ I need the **Manage Permissions** permission in this channel to add users." });
      return;
    }

    const user = interaction.options.getUser("user", true);

    if (user.bot) {
      await interaction.editReply({ content: "❌ You cannot add bots to tickets." });
      return;
    }

    if (user.id === ticket.creatorId) {
      await interaction.editReply({ content: "⚠️ That user is already the ticket owner." });
      return;
    }

    await (interaction.channel as any).permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });

    await interaction.editReply({ content: `✅ ${user} has been added to the ticket.` });
    
    await (interaction.channel as any).send({
      content: `➕ ${interaction.user} added ${user} to the ticket.`,
    });
  },
};

export default command;