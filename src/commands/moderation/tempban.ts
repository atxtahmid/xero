import { ModerationAction } from "@prisma/client";
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { createCase } from "../../services/caseService.js";
import { sendModLog } from "../../services/modLogService.js";
import {
  createSuccessEmbed,
  sendModerationDM,
} from "../../services/moderationService.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("Temporarily ban a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to temporarily ban.").setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName("days").setDescription("Duration of the ban in days.").setRequired(true).setMinValue(1).setMaxValue(365)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for the temporary ban.").setRequired(false).setMaxLength(500)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);
    const days = interaction.options.getInteger("days", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided.";

    if (member) {
      const check = await canModerate(interaction, member);
      if (!check.success) {
        await interaction.editReply({ content: check.message! });
        return;
      }
      if (!member.bannable) {
        await interaction.editReply({ content: "❌ I cannot ban this member." });
        return;
      }
    }

    try {
      if (member) {
        await sendModerationDM({
          action: "Temp Ban",
          guild: interaction.guild,
          moderator: interaction.user,
          member,
          reason,
          duration: `${days} day(s)`,
        });
      }

      await interaction.guild.bans.create(targetUser.id, {
        reason: `Tempban (${days}d) | ${interaction.user.tag}: ${reason}`,
      });

      const modCase = await createCase({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: ModerationAction.TEMP_BAN,
        reason: `[Duration: ${days}d] ${reason}`,
      });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: "Temp Ban",
        reason: reason,
        caseId: modCase.id,
        duration: `${days} days`,
      });

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            "Member Temporarily Banned",
            [
              `**User:** ${targetUser.tag} (\`${targetUser.id}\`)`,
              `**Duration:** ${days} day(s)`,
              `**Reason:** ${reason}`,
              `**Case ID:** ${modCase.id}`,
              "\n⚠️ *Note: Automatic unban requires a background worker.*",
            ].join("\n")
          ),
        ],
      });
    } catch (error) {
      console.error("[Tempban Command] Error:", error);
      await interaction.editReply({ content: "❌ Failed to execute temporary ban." });
    }
  },
};

export default command;