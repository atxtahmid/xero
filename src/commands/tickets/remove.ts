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
    .setName("remove")
    .setDescription("Remove a user from the current ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to remove.")
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
      await interaction.editReply({ content: "❌ I need the **Manage Permissions** permission in this channel to remove users." });
      return;
    }

    const user = interaction.options.getUser("user", true);

    if (user.id === ticket.creatorId) {
      await interaction.editReply({ content: "❌ You cannot remove the ticket owner." });
      return;
    }

    // Check if user actually has an overwrite
    const overwrite = (interaction.channel as any).permissionOverwrites.cache.get(user.id);
    if (!overwrite) {
      await interaction.editReply({ content: "⚠️ That user is not explicitly added to this ticket." });
      return;
    }

    await overwrite.delete();

    await interaction.editReply({ content: `✅ ${user} has been removed from the ticket.` });

    await (interaction.channel as any).send({
      content: `➖ ${interaction.user} removed ${user} from the ticket.`,
    });
  },
};

export default command;