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
  cooldown: 10,

  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Soft ban a member (Ban then immediately Unban to clear messages).")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to soft ban.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the soft ban.")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete-history")
        .setDescription("Delete message history (0-7 days). Default: 1 day.")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    if (member) {
      const check = canModerate(interaction, member);
      if (!check.success) {
        await interaction.editReply({ content: check.message! });
        return;
      }
      if (!member.bannable) {
        return interaction.editReply({ content: "❌ I cannot ban this member." });
      }
    }

    const reason = interaction.options.getString("reason") ?? "No reason provided.";
    const deleteDays = interaction.options.getInteger("delete-history") ?? 1;
    const deleteSeconds = deleteDays * 24 * 60 * 60;

    try {
      // 1. DM User
      if (member) {
        await sendModerationDM({
          action: "Soft Ban",
          guild: interaction.guild,
          moderator: interaction.user,
          member,
          reason,
        });
      }

      // 2. Ban with history deletion
      await interaction.guild.bans.create(targetUser.id, {
        reason: `Softban | ${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteSeconds,
      });

      // 3. Unban immediately
      await interaction.guild.bans.remove(targetUser.id, "Softban completion.");

      // 4. Logs and Cases
      const modCase = await createCase({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: ModerationAction.SOFT_BAN,
        reason,
      });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: "Soft Ban",
        reason: `${reason} (${deleteDays} days history cleared)`,
        caseId: modCase.id,
      });

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            "Member Soft Banned",
            [
              `**User:** ${targetUser.tag} (\`${targetUser.id}\`)`,
              `**Reason:** ${reason}`,
              `**History Cleared:** ${deleteDays} day(s)`,
              `**Case ID:** ${modCase.id}`,
            ].join("\n")
          ),
        ],
      });
    } catch (error) {
      console.error("[Softban Command] Error:", error);
      await interaction.editReply({ content: "❌ Failed to execute softban." });
    }
  },
};

export default command;