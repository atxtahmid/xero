import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";
import logger from "../../services/logger.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot send a message.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Message to send.")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) return;

    const message = interaction.options.getString("message", true);

    // 1. Bot Permission Validation
    const me = interaction.guild.members.me;
    if (!me?.permissionsIn(interaction.channel as any).has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: "❌ I do not have permission to send messages in this channel.",
        ephemeral: true,
      });
      return;
    }

    // 2. Perform Action with mention suppression for safety
    try {
      await (interaction.channel as TextChannel).send({
        content: message,
        allowedMentions: { parse: [] }, // Prevents bot from being used to ping @everyone
      });

      await interaction.reply({
        content: "✅ Message sent.",
        ephemeral: true,
      });

      // 3. Log trail (Important for anonymity control)
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.user,
        action: "Bot Say",
        reason: `Sent a message via bot: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`,
        caseId: "N/A",
      });
    } catch (error) {
      logger.error("[Say Command] Error:", error);
      await interaction.reply({ content: "❌ Failed to send message.", ephemeral: true });
    }
  },
};

export default command;