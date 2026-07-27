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
    .setName("softban")
    .setDescription(
      "Soft ban a member (ban then immediately unban).",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member to soft ban.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(
          "Reason for the soft ban.",
        )
        .setRequired(false),
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
          "❌ I can't soft ban that member.",
        ephemeral: true,
      });

      return;
    }

    const reason =
      interaction.options.getString(
        "reason",
      ) ?? "No reason provided.";

    const deleteHistory =
      interaction.options.getInteger(
        "delete-history",
      ) ?? 1;

    await sendModerationDM({
      action: "Soft Ban",
      guild: interaction.guild,
      moderator: interaction.user,
      member,
      reason,
    });

    await member.ban({
      reason,
      deleteMessageSeconds:
        deleteHistory *
        24 *
        60 *
        60,
    });

    await interaction.guild.members.unban(
      member.id,
      "Soft ban completed.",
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
          ModerationAction.SOFT_BAN,
        reason,
      });

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          "Member Soft Banned",
          [
            `**User:** ${member.user.tag}`,
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