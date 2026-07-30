import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 15, // Higher cooldown due to Discord rate limits
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename the current ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("New ticket name.")
        .setRequired(true)
        .setMaxLength(80)
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
    const isStaff = 
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

    if (!isStaff) {
      await interaction.editReply({ content: "❌ You do not have permission to manage this ticket." });
      return;
    }

    // Input Sanitization: Discord text channels must be lowercase and use dashes
    const rawName = interaction.options.getString("name", true);
    const sanitizedName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!sanitizedName) {
      await interaction.editReply({ content: "❌ The name provided is invalid for a Discord channel." });
      return;
    }

    try {
      // Discord strictly limits channel renames to 2 per 10 minutes.
      await interaction.channel.setName(sanitizedName, `Ticket renamed by ${interaction.user.tag}`);
      
      await interaction.editReply({ 
        content: `✅ Ticket renamed to **${sanitizedName}**. \n⚠️ *Note: Discord limits renames to 2 per 10 minutes.*` 
      });

      await (interaction.channel as any).send({
        content: `📝 ${interaction.user} renamed the ticket to \`${sanitizedName}\`.`,
      });
    } catch (error: any) {
      if (error.code === 50035) {
        await interaction.editReply({ 
          content: "❌ Failed to rename. Discord has a 2-rename limit per 10 minutes for channels." 
        });
      } else {
        console.error("[Ticket Rename] Error:", error);
        await interaction.editReply({ content: "❌ An error occurred while renaming the channel." });
      }
    }
  },
};

export default command;