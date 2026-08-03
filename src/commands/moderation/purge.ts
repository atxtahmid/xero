import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";
import logger from "../../services/logger.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) return;

    // Ephemeral defer to keep the channel clean
    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger("amount", true);
    const channel = interaction.channel;

    if (!channel.isTextBased() || !("bulkDelete" in channel)) {
      await interaction.editReply({ content: "❌ This channel does not support bulk deletion." });
      return;
    }

    try {
      // Discord cannot bulk delete messages older than 14 days
      const deleted = await channel.bulkDelete(amount, true);
      
      const difference = amount - deleted.size;
      let response = `🗑️ Deleted **${deleted.size}** message(s).`;
      
      if (difference > 0) {
        response += `\n⚠️ **${difference}** message(s) were older than 14 days and could not be deleted.`;
      }

      await interaction.editReply({ content: response });

      // Send ModLog for traceability
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.user, // Target is the channel/context, but modlog expects a User
        action: "Purge",
        reason: `Bulk deleted ${deleted.size} messages in <#${channel.id}>.`,
        caseId: "N/A",
      });

    } catch (error) {
      logger.error("[Purge Command] Error:", error);
      await interaction.editReply({ content: "❌ An error occurred while trying to purge messages." });
    }
  },
};

export default command;