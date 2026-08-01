import {
  ModerationAction,
} from "@prisma/client";
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { createCase } from "../../services/caseService.js";
import logger from "../../services/logger.js";
import { sendModLog } from "../../services/modLogService.js";
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

const DELETE_MESSAGE_SECONDS = 60 * 60 * 24;

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 10,

  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Ban then unban to clear messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("The member to softban.")
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("reason")
        .setDescription("Reason for the softban.")
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const targetUser =
      interaction.options.getUser("user", true);

    const member = await fetchMember(
      interaction,
      targetUser.id,
    );

    const reason =
      interaction.options.getString("reason") ??
      "No reason provided.";

    if (!member) {
      await interaction.editReply({
        content:
          "❌ That user is not currently in this server.",
      });
      return;
    }

    const check = canModerate(
      interaction,
      member,
    );

    if (!check.success) {
      await interaction.editReply({
        content: check.message!,
      });
      return;
    }

    const me = interaction.guild.members.me;

    if (!me) {
      await interaction.editReply({
        content:
          "❌ Unable to determine my permissions.",
      });
      return;
    }

    if (
      !me.permissions.has(
        PermissionFlagsBits.BanMembers,
      ) ||
      member.roles.highest.position >=
        me.roles.highest.position
    ) {
      await interaction.editReply({
        content:
          "❌ I cannot ban this member due to role hierarchy or missing permissions.",
      });
      return;
    }

    try {
      await sendModerationDM({
        action: "Soft Ban",
        guild: interaction.guild,
        moderator: interaction.user,
        member,
        reason,
      }).catch((error) => {
        logger.warn(
          `Failed to DM ${targetUser.tag}: ${
            error instanceof Error
              ? error.message
              : error
          }`,
        );
      });

      await interaction.guild.bans.create(
        targetUser.id,
        {
          deleteMessageSeconds:
            DELETE_MESSAGE_SECONDS,
          reason,
        },
      );

      await interaction.guild.bans.remove(
        targetUser.id,
        `Softban completed by ${interaction.user.tag}`,
      );

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
        reason,
        caseId: modCase.id,
      });

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            "Soft Ban Successful",
            `**User:** ${targetUser.tag}\n**Case:** ${modCase.id}`,
          ),
        ],
      });
    } catch (error) {
      logger.error("[SoftBan]", error);

      await interaction.editReply({
        content: "❌ Execution failed.",
      });
    }
  },
};

export default command;
