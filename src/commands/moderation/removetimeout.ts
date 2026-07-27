import {
  ModerationAction,
} from "@prisma/client";

import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import {
  createCase,
} from "../../services/caseService.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

import {
  canModerate,
  fetchMember,
} from "../../utils/moderation.js";

import {
  createSuccessEmbed,
  sendModerationDM,
} from "../../services/moderationService.js";

import {
  sendModLog,
} from "../../services/modLogService.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("removetimeout")
    .setDescription(
      "Remove a member's timeout.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member whose timeout will be removed.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(
          "Reason for removing the timeout.",
        )
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

    const member =
      await fetchMember(
        interaction,
        interaction.options.getUser(
          "user",
          true,
        ).id,
      );

    if (!member) {
      await interaction.reply({
        content:
          "❌ Member not found.",
        ephemeral: true,
      });

      return;
    }

    const check =
      canModerate(
        interaction,
        member,
      );

    if (!check.success) {
      await interaction.reply({
        content: check.message!,
        ephemeral: true,
      });

      return;
    }

    if (
      !member.isCommunicationDisabled()
    ) {
      await interaction.reply({
        content:
          "❌ This member is not currently timed out.",
        ephemeral: true,
      });

      return;
    }

    const reason =
      interaction.options.getString(
        "reason",
      ) ?? "No reason provided.";

    await sendModerationDM({
      action: "Timeout Removed",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
    });

    await member.timeout(
      null,
      reason,
    );

    const modCase =
      await createCase({
        guildId:
          interaction.guild.id,
        userId:
          member.id,
        moderatorId:
          interaction.user.id,
        action:
          ModerationAction.TIMEOUT_REMOVED,
        reason,
      });
      
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: member.user,
        action: "Timeout Removed",
        reason,
        caseId: modCase.id,
      });

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          "Timeout Removed",
          [
            `**User:** ${member.user.tag}`,
            `**Reason:** ${reason}`,
            `**Case ID:** ${modCase.id}`,
          ].join("\n"),
        ),
      ],
    });
  },
};

export default command;