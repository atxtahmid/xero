import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";
import tempBanService from "../../services/tempBanService.js";
import logger from "../../services/logger.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option.setName("user").setDescription("User ID to unban.").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for the unban.").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const userId = interaction.options.getString("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided.";

    try {
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      
      if (!ban) {
        await interaction.editReply({ content: "❌ This user is not banned from this server." });
        return;
      }

      await interaction.guild.bans.remove(userId, `${interaction.user.tag}: ${reason}`);

      // If this user had a temp ban pending auto-lift, drop that
      // tracking row now — otherwise it just sits there harmlessly until
      // the scheduler's next pass finds them already unbanned, but no
      // reason to leave it stale in the meantime.
      await tempBanService.remove(interaction.guild.id, userId);

      await interaction.editReply({
        content: `✅ User **${ban.user.tag}** (\`${userId}\`) has been unbanned.\n**Reason:** ${reason}`,
      });

      // Note: Prisma schema ModerationAction currently lacks an UNBAN action.
      // We log to Discord for audit trail.
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: ban.user,
        action: "Unban",
        reason,
        caseId: "N/A",
      });
    } catch (error) {
      logger.error("[Unban Command] Error:", error);
      await interaction.editReply({ content: "❌ Failed to unban user. Ensure the ID is correct and I have permissions." });
    }
  },
};

export default command;