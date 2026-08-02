import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import warningService from "../../services/warningService.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View a member's warnings.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to view.")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    // 1. Hierarchy Check
    if (member) {
      const check = await canModerate(interaction, member);
      if (!check.success) {
        await interaction.editReply({ content: check.message! });
        return;
      }
    }

    const warnings = await warningService.getAll(interaction.guild.id, targetUser.id);
    const totalCount = warnings.length;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`⚠️ Warnings • ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    if (totalCount === 0) {
      embed.setDescription("✅ This user has no warnings.");
    } else {
      // Limit to last 15 to prevent Discord Embed character limits (6000 chars)
      const recentWarnings = warnings.slice(0, 15);
      const description = recentWarnings
        .map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}\n└ *By <@${w.moderatorId}> • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>*`
        )
        .join("\n\n");

      embed.setDescription(description);
      if (totalCount > 15) {
        embed.setFooter({ text: `Showing latest 15 of ${totalCount} warnings.` });
      } else {
        embed.setFooter({ text: `Total Warnings: ${totalCount}` });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;