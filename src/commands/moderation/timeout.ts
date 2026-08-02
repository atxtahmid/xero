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
    .setName("timeout")
    .setDescription("Timeout a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to timeout.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Duration in minutes (Max 40320 - 28 days).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout.")
        .setRequired(false)
        .setMaxLength(500) // Discord Audit Log limit is 512
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    if (!member) {
      await interaction.editReply({ content: "❌ That member is no longer in the server." });
      return;
    }

    // 1. Hierarchy and Permission Validation
    const check = await canModerate(interaction, member);
    if (!check.success) {
      await interaction.editReply({ content: check.message! });
      return;
    }

    if (!member.moderatable) {
      await interaction.editReply({ content: "❌ I cannot timeout this member. They may have a higher role than me." });
      return;
    }

    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided.";
    const durationMs = minutes * 60 * 1000;

    // 2. DM the user before timeout
    const dmSent = await sendModerationDM({
      action: "Timeout",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
      duration: `${minutes} minute(s)`,
    });

    // 3. Perform the Timeout
    try {
      await member.timeout(durationMs, `${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error("[Timeout Command] Error:", error);
      await interaction.editReply({ content: "❌ Failed to execute the timeout." });
      return;
    }

    // 4. Create Database Case
    const modCase = await createCase({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      action: ModerationAction.TIMEOUT,
      reason,
    });

    // 5. Send Log
    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: targetUser,
      action: "Timeout",
      reason,
      caseId: modCase.id,
      duration: `${minutes}m`,
    });

    // 6. Reply to Moderator
    const dmStatus = dmSent ? "" : "\n⚠️ *Note: Could not DM the user (DMs closed).*";
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          "Member Timed Out",
          [
            `**User:** ${targetUser.tag} (\`${targetUser.id}\`)`,
            `**Duration:** ${minutes} minute(s)`,
            `**Reason:** ${reason}`,
            `**Case ID:** ${modCase.id}`,
            dmStatus,
          ].join("\n")
        ),
      ],
    });
  },
};

export default command;