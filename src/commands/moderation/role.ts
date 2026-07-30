import { ChatInputCommandInteraction, PermissionFlagsBits, Role, SlashCommandBuilder } from "discord.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage member roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName("add").addUserOption(o => o.setName("user").setRequired(true)).addRoleOption(o => o.setName("role").setRequired(true)))
    .addSubcommand(s => s.setName("remove").addUserOption(o => o.setName("user").setRequired(true)).addRoleOption(o => o.setName("role").setRequired(true))) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);
    const role = interaction.options.getRole("role", true) as Role;

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
    if (!me || role.position >= me.roles.highest.position) {
      await interaction.reply({ content: "❌ I cannot manage this role.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "add") await member.roles.add(role);
      else await member.roles.remove(role);

      await interaction.reply({ content: `✅ Role ${role.name} ${sub}ed.` });
      await sendModLog({
        guild: interaction.guild, moderator: interaction.user, target: targetUser,
        action: `Role ${sub}`, reason: `Role: ${role.name}`, caseId: "N/A"
      });
    } catch {
      await interaction.reply({ content: "❌ Failed to update role.", ephemeral: true });
    }
  },
};
export default command;