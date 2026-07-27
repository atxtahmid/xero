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
    .setName("timeout")
    .setDescription(
      "Timeout a member.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member to timeout.",
        )
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription(
          "Duration in minutes.",
        )
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(
          "Reason for the timeout.",
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

    if (!member.moderatable) {
      await interaction.reply({
        content:
          "❌ I can't timeout that member.",
        ephemeral: true,
      });

      return;
    }

    const minutes =
      interaction.options.getInteger(
        "minutes",
        true,
      );

    const reason =
      interaction.options.getString(
        "reason",
      ) ?? "No reason provided.";

    await sendModerationDM({
      action: "Timeout",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
      duration: `${minutes} minute(s)`,
    });

    await member.timeout(
      minutes * 60 * 1000,
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
          ModerationAction.TIMEOUT,
        reason,
      });
      
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: member.user,
        action: "Timeout",
        reason,
        caseId: modCase.id,
      });

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          "Member Timed Out",
          [
            `**User:** ${member.user.tag}`,
            `**Duration:** ${minutes} minute(s)`,
            `**Reason:** ${reason}`,
            `**Case ID:** ${modCase.id}`,
          ].join("\n"),
        ),
      ],
    });
  },
};

export default command;