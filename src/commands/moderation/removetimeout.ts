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
    .setName("removetimeout")
    .setDescription("Remove a member's timeout.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member whose timeout will be removed.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for removing the timeout.")
        .setRequired(false)
        .setMaxLength(500)
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

    // 1. Hierarchy Validation
    const check = canModerate(interaction, member);
    if (!check.success) {
      await interaction.editReply({ content: check.message! });
      return;
    }

    if (!member.communicationDisabledUntilTimestamp) {
      await interaction.editReply({ content: "❌ This member is not currently timed out." });
      return;
    }

    const reason = interaction.options.getString("reason") ?? "No reason provided.";

    // 2. Perform action
    try {
      await member.timeout(null, `${interaction.user.tag}: ${reason}`);

      // 3. DM User
      const dmSent = await sendModerationDM({
        action: "Timeout Removed",
        guild: interaction.guild,
        moderator: interaction.user,
        member,
        reason,
      });

      // 4. DB and Logs
      const modCase = await createCase({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        action: ModerationAction.TIMEOUT_REMOVED,
        reason,
      });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: "Timeout Removed",
        reason,
        caseId: modCase.id,
      });

      const dmStatus = dmSent ? "" : "\n⚠️ *Note: Could not DM the user.*";
      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            "Timeout Removed",
            [
              `**User:** ${targetUser.tag} (\`${targetUser.id}\`)`,
              `**Reason:** ${reason}`,
              `**Case ID:** ${modCase.id}`,
              dmStatus,
            ].join("\n")
          ),
        ],
      });
    } catch (error) {
      console.error("[RemoveTimeout Command] Error:", error);
      await interaction.editReply({ content: "❌ Failed to remove the timeout." });
    }
  },
};

export default command;