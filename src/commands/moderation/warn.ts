import { ModerationAction } from "@prisma/client";
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { createCase } from "../../services/caseService.js";
import { sendModLog } from "../../services/modLogService.js";
import warningService from "../../services/warningService.js";
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
    .setName("warn")
    .setDescription("Warn a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to warn.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning.")
        .setRequired(true)
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

    // 1. Hierarchy Validation (Critical for Staff protection)
    const check = await canModerate(interaction, member);
    if (!check.success) {
      await interaction.editReply({ content: check.message! });
      return;
    }

    const reason = interaction.options.getString("reason", true);

    // 2. Database Case Creation (formal record)
    const modCase = await createCase({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      action: ModerationAction.WARN,
      reason,
    });

    // 3. Warning Table Entry (used by /warnings history)
    // Previously called db.warning.create() directly here instead of
    // going through warningService.create() — meaning it skipped the
    // same FK-safety guarantee warningService.ts now provides. It hadn't
    // caused a visible failure only because createCase() (above) happens
    // to ensure the same User rows as a side effect first. Using the
    // shared service directly removes that fragile ordering dependency.
    const warning = await warningService.create(
      interaction.guild.id,
      member.id,
      interaction.user.id,
      reason,
    );

    // 4. DM the user
    const dmSent = await sendModerationDM({
      action: "Warn",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
      caseId: modCase.id,
    });

    // 5. Send Log
    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: targetUser,
      action: "Warn",
      reason,
      caseId: modCase.id,
    });

    // 6. Final Reply
    const dmStatus = dmSent ? "" : "\n⚠️ *Note: Could not DM the user (DMs closed).*";
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          "Member Warned",
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
