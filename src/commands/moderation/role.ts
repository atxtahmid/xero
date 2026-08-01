import {
  ChatInputCommandInteraction,
  GuildMember,
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
    .setDescription("Manage member roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add a role to a member.")
        .addUserOption((o) =>
          o
            .setName("user")
            .setDescription("The member to give the role to.")
            .setRequired(true),
        )
        .addRoleOption((o) =>
          o
            .setName("role")
            .setDescription("The role to add.")
            .setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove a role from a member.")
        .addUserOption((o) =>
          o
            .setName("user")
            .setDescription("The member to remove the role from.")
            .setRequired(true),
        )
        .addRoleOption((o) =>
          o
            .setName("role")
            .setDescription("The role to remove.")
            .setRequired(true),
        ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);
    const role = interaction.options.getRole("role", true) as Role;

    if (!member) {
      await interaction.reply({
        content: "❌ Member not found.",
        ephemeral: true,
      });
      return;
    }

    const check = canModerate(interaction, member);

    if (!check.success) {
      await interaction.reply({
        content: check.message!,
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild.members.me;

    if (!me) {
      await interaction.reply({
        content: "❌ Unable to determine my permissions.",
        ephemeral: true,
      });
      return;
    }

    if (role.managed) {
      await interaction.reply({
        content: "❌ Managed roles cannot be assigned or removed.",
        ephemeral: true,
      });
      return;
    }

    if (role.position >= me.roles.highest.position) {
      await interaction.reply({
        content: "❌ I cannot manage this role.",
        ephemeral: true,
      });
      return;
    }

    const moderator = interaction.member as GuildMember;

    if (
      role.position >= moderator.roles.highest.position
    ) {
      await interaction.reply({
        content:
          "❌ You cannot manage a role equal to or higher than your highest role.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (
      sub === "add" &&
      member.roles.cache.has(role.id)
    ) {
      await interaction.reply({
        content: "❌ That member already has this role.",
        ephemeral: true,
      });
      return;
    }

    if (
      sub === "remove" &&
      !member.roles.cache.has(role.id)
    ) {
      await interaction.reply({
        content: "❌ That member does not have this role.",
        ephemeral: true,
      });
      return;
    }

    try {
      if (sub === "add") {
        await member.roles.add(role);
      } else {
        await member.roles.remove(role);
      }

      await interaction.reply({
        content: `✅ Role **${role.name}** ${
          sub === "add" ? "added" : "removed"
        } successfully.`,
      });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: `Role ${sub}`,
        reason: `Role: ${role.name} (${role.id})`,
        caseId: "N/A",
      });
    } catch {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Failed to update role.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ Failed to update role.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;
