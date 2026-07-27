import {
  ModerationAction,
} from "@prisma/client";

import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";

import {
  createCase,
} from "../../services/caseService.js";

import {
  sendModLog,
} from "../../services/modLogService.js";

import {
  createSuccessEmbed,
  sendModerationDM,
} from "../../services/moderationService.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

import {
  canModerate,
  fetchMember,
} from "../../utils/moderation.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to warn.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning.")
        .setRequired(true),
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

    const reason =
      interaction.options.getString(
        "reason",
        true,
      );

    const warning =
      await db.warning.create({
        data: {
          guildId:
            interaction.guild.id,
          userId:
            member.id,
          moderatorId:
            interaction.user.id,
          reason,
        },
      });

    const modCase =
      await createCase({
        guildId:
          interaction.guild.id,
        userId:
          member.id,
        moderatorId:
          interaction.user.id,
        action:
          ModerationAction.WARN,
        reason,
      });

    await sendModerationDM({
      action: "Warn",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
      caseId: modCase.id,
    });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: member.user,
      action: "Warn",
      reason,
      caseId: modCase.id,
    });

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          "Member Warned",
          [
            `**User:** ${member.user.tag}`,
            `**Reason:** ${reason}`,
            `**Warning ID:** ${warning.id}`,
            `**Case ID:** ${modCase.id}`,
          ].join("\n"),
        ),
      ],
    });
  },
};

export default command;