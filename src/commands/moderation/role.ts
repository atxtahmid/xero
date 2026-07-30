import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
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
    .setName("role")
    .setDescription("Add or remove a role from a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to a member.")
        .addUserOption((opt) => opt.setName("user").setDescription("Member.").setRequired(true))
        .addRoleOption((opt) => opt.setName("role").setDescription("Role to add.").setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a member.")
        .addUserOption((opt) => opt.setName("user").setDescription("Member.").setRequired(true))
        .addRoleOption((opt) => opt.setName("role").setDescription("Role to remove.").setRequired(true))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
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

    // 1. Hierarchy Check: Moderator vs Role
    const moderator = interaction.member as any;
    if (interaction.user.id !== interaction.guild.ownerId && role.position >= moderator.roles.highest.position) {
      await interaction.reply({
        content: "❌ You cannot manage a role that is equal to or higher than your highest role.",
        ephemeral: true,
      });
      return;
    }

    // 2. Hierarchy Check: Bot vs Role
    const me = interaction.guild.members.me;
    if (!me || role.position >= me.roles.highest.position) {
      await interaction.reply({
        content: "❌ I cannot manage this role as it is equal to or higher than my highest role.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const hasRole = member.roles.cache.has(role.id);

    try {
      if (subcommand === "add") {
        if (hasRole) return interaction.reply({ content: "❌ Member already has that role.", ephemeral: true });
        await member.roles.add(role);
      } else {
        if (!hasRole) return interaction.reply({ content: "❌ Member doesn't have that role.", ephemeral: true });
        await member.roles.remove(role);
      }

      await interaction.reply({ content: `✅ Successfully ${subcommand === "add" ? "added" : "removed"} ${role} for ${member}.` });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: `Role ${subcommand === "add" ? "Add" : "Remove"}`,
        reason: `${subcommand === "add" ? "Added" : "Removed"} role: ${role.name}`,
        caseId: "N/A",
      });
    } catch (error) {
      console.error("[Role Command] Error:", error);
      await interaction.reply({ content: "❌ Failed to update roles.", ephemeral: true });
    }
  },
};

export default command;