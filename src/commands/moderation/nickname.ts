import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

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

  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("nickname")
    .setDescription(
      "Change or reset a member's nickname.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageNicknames,
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "Member to edit.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription(
          "Leave empty to reset the nickname.",
        )
        .setMaxLength(32)
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

    const me =
      interaction.guild.members.me;

    if (
      !me?.permissions.has(
        PermissionFlagsBits.ManageNicknames,
      )
    ) {
      await interaction.reply({
        content:
          "❌ I need the **Manage Nicknames** permission.",
        ephemeral: true,
      });

      return;
    }

    const nickname =
      interaction.options.getString(
        "nickname",
      );

    await member.setNickname(
      nickname,
    );

    await interaction.reply({
      content: nickname
        ? `✅ ${member} nickname changed to **${nickname}**.`
        : `✅ ${member}'s nickname has been reset.`,
    });
  },
};

export default command;