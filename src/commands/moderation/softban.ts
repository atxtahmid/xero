import { ModerationAction } from "@prisma/client";
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCase } from "../../services/caseService.js";
import { sendModLog } from "../../services/modLogService.js";
import { createSuccessEmbed, sendModerationDM } from "../../services/moderationService.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Ban then unban to clear messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("user").setRequired(true))
    .addStringOption(o => o.setName("reason").setRequired(false)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);
    const reason = interaction.options.getString("reason") ?? "No reason provided.";

    if (member) {
      const check = canModerate(interaction, member);
      if (!check.success) {
        await interaction.editReply({ content: check.message! });
        return;
      }
    }

    try {
      await interaction.guild.bans.create(targetUser.id, { deleteMessageSeconds: 86400, reason });
      await interaction.guild.bans.remove(targetUser.id, "Softban complete");

      const modCase = await createCase({
        guildId: interaction.guild.id, userId: targetUser.id, moderatorId: interaction.user.id,
        action: ModerationAction.SOFT_BAN, reason
      });

      await sendModLog({ guild: interaction.guild, moderator: interaction.user, target: targetUser, action: "Soft Ban", reason, caseId: modCase.id });
      await interaction.editReply({ embeds: [createSuccessEmbed("Soft Ban", `User: ${targetUser.tag}`)] });
    } catch {
      await interaction.editReply("❌ Execution failed.");
    }
  },
};
export default command;