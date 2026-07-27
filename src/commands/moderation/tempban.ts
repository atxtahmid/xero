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

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription(
      "Temporarily ban a member.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member to temporarily ban.",
        )
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription(
          "Duration of the temporary ban in days.",
        )
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(365),
    )
    .addIntegerOption((option) =>
      option
        .setName("delete-history")
        .setDescription(
          "Delete message history (0-7 days).",
        )
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(
          "Reason for the temporary ban.",
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

    if (!member.bannable) {
      await interaction.reply({
        content:
          "❌ I can't temporarily ban that member.",
        ephemeral: true,
      });

      return;
    }

    const days =
      interaction.options.getInteger(
        "days",
        true,
      );

    const deleteHistory =
      interaction.options.getInteger(
        "delete-history",
      ) ?? 0;

    const reason =
      interaction.options.getString(
        "reason",
      ) ?? "No reason provided.";

    await sendModerationDM({
      action: "Temp Ban",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
      duration: `${days} day(s)`,
    });

    await member.ban({
      reason,
      deleteMessageSeconds:
        deleteHistory *
        24 *
        60 *
        60,
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
          ModerationAction.TEMP_BAN,
        reason,
      });

    // TODO:
    // Store the tempban in the database and let the
    // scheduled unban service remove it automatically
    // when the duration expires.

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          "Member Temporarily Banned",
          [
            `**User:** ${member.user.tag}`,
            `**Duration:** ${days} day(s)`,
            `**Reason:** ${reason}`,
            `**Deleted History:** ${deleteHistory} day(s)`,
            `**Case ID:** ${modCase.id}`,
          ].join("\n"),
        ),
      ],
    });
  },
};

export default command;