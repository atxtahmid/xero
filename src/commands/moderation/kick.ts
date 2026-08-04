import { ModerationAction } from "@prisma/client";
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { createCase } from "../../services/moderation/caseService.js";
import { sendModLog } from "../../services/moderation/modLogService.js";
import {
  createSuccessEmbed,
  sendModerationDM,
} from "../../services/moderation/moderationService.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to kick.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick.")
        .setRequired(false)
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

    if (!member.kickable) {
      await interaction.editReply({ content: "❌ I do not have permission to kick this member." });
      return;
    }

    const reason = interaction.options.getString("reason") ?? "No reason provided.";

    // 2. DM the user before kicking
    const dmSent = await sendModerationDM({
      action: "Kick",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
    });

    // 3. Perform the Kick
    try {
      await member.kick(`${interaction.user.tag}: ${reason}`);
    } catch (error) {
      await interaction.editReply({ content: "❌ Failed to execute the kick. Check my permissions." });
      return;
    }

    // 4. Create Database Case
    const modCase = await createCase({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      action: ModerationAction.KICK,
      reason,
    });

    // 5. Send Log
    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: targetUser,
      action: "Kick",
      reason,
      caseId: modCase.id,
    });

    // 6. Reply to Moderator
    const dmStatus = dmSent ? "" : "\n⚠️ *Note: Could not DM the user (DMs closed).*";
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          "Member Kicked",
          [
            `**User:** ${targetUser.tag} (\`${targetUser.id}\`)`,
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