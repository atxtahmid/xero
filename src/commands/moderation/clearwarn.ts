import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import warningService from "../../services/moderation/warningService.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";
import { sendModLog } from "../../services/moderation/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("clearwarn")
    .setDescription("Remove one or all warnings from a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member whose warnings will be removed.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Clear one specific warning or all.")
        .setRequired(true)
        .addChoices(
          { name: "Specific Warning", value: "one" },
          { name: "All Warnings", value: "all" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Warning number (see /warnings).")
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);
    const type = interaction.options.getString("type", true);
    const number = interaction.options.getInteger("number");

    // 1. Hierarchy Check: Prevent clearing records for superiors
    if (member) {
      const check = await canModerate(interaction, member);
      if (!check.success) {
        await interaction.editReply({ content: check.message! });
        return;
      }
    }

    if (type === "all") {
      await warningService.clear(interaction.guild.id, targetUser.id);
      
      await interaction.editReply({ content: `✅ Cleared all warnings for **${targetUser.tag}**.` });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: "Clear Warnings",
        reason: "Moderator cleared all warning records.",
        caseId: "N/A",
      });
      return;
    }

    // Single warning removal logic
    if (!number) {
      await interaction.editReply({ content: "❌ You must provide a warning number when using type 'Specific Warning'." });
      return;
    }

    const warnings = await warningService.getAll(interaction.guild.id, targetUser.id);

    if (number < 1 || number > warnings.length) {
      await interaction.editReply({ content: "❌ Invalid warning number. Check `/warnings` for the correct list." });
      return;
    }

    const targetWarning = warnings[number - 1];
    await warningService.delete(targetWarning.id);

    await interaction.editReply({ content: `✅ Removed warning **#${number}** from **${targetUser.tag}**.` });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: targetUser,
      action: "Remove Warning",
      reason: `Moderator removed specific warning: ${targetWarning.reason}`,
      caseId: "N/A",
    });
  },
};

export default command;