import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Change or reset a member's nickname.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to edit.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("Leave empty to reset the nickname.")
        .setMaxLength(32)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    if (!member) {
      await interaction.reply({ content: "❌ Member not found.", ephemeral: true });
      return;
    }

    const check = canModerate(interaction, member);
    if (!check.success) {
      await interaction.reply({ content: check.message!, ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      await interaction.reply({
        content: "❌ I need the **Manage Nicknames** permission.",
        ephemeral: true,
      });
      return;
    }

    const nickname = interaction.options.getString("nickname");
    const actionText = nickname ? `to **${nickname}**` : "to their default name";

    try {
      await member.setNickname(nickname, `Modified by ${interaction.user.tag}`);

      await interaction.reply({
        content: `✅ Changed nickname for ${member} ${actionText}.`,
      });

      // Send ModLog
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: "Nickname Change",
        reason: nickname ? `Changed nickname to: ${nickname}` : "Reset nickname",
        caseId: "N/A",
      });
    } catch (error) {
      console.error("[Nickname Command] Error:", error);
      await interaction.reply({
        content: "❌ I cannot change that user's nickname. Their highest role may be above mine.",
        ephemeral: true,
      });
    }
  },
};

export default command;