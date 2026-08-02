import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";
import { isTrustedOwner } from "../../utils/ownerTrust.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 30, // High cooldown for mass operation

  data: new SlashCommandBuilder()
    .setName("massrole")
    .setDescription("Add or remove a role from multiple members.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub.setName("add").setDescription("Add a role to everyone.").addRoleOption((opt) => opt.setName("role").setDescription("Role to add.").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Remove a role from everyone.").addRoleOption((opt) => opt.setName("role").setDescription("Role to remove.").setRequired(true))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const role = interaction.options.getRole("role", true) as Role;
    const me = interaction.guild.members.me;
    const moderator = interaction.member as any;

    // 1. Hierarchy Check: Moderator vs Role
    const moderatorIsTrustedOwner = await isTrustedOwner(interaction.guild, interaction.user.id);
    if (!moderatorIsTrustedOwner && role.position >= moderator.roles.highest.position) {
      await interaction.editReply("❌ You cannot manage a role higher than or equal to yours.");
      return;
    }

    // 2. Hierarchy Check: Bot vs Role
    if (!me || role.position >= me.roles.highest.position) {
      await interaction.editReply("❌ I cannot manage this role (it is above me).");
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    
    // 3. Batch Processing to prevent 429 Ratelimits
    // We only process cached members to avoid massive API fetches on Railway
    const members = interaction.guild.members.cache.filter(m => !m.user.bot);
    let affected = 0;

    for (const member of members.values()) {
      try {
        if (subcommand === "add" && !member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          affected++;
        } else if (subcommand === "remove" && member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
          affected++;
        }
        
        // Minor delay to respect rate limits if many members are cached
        if (affected % 10 === 0) await new Promise(r => setTimeout(r, 1000));
      } catch { continue; }
    }

    await interaction.editReply({
      content: `✅ Operation finished. ${subcommand === "add" ? "Added" : "Removed"} ${role} for **${affected}** member(s).`
    });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: interaction.user,
      action: `Mass Role ${subcommand === "add" ? "Add" : "Remove"}`,
      reason: `${subcommand === "add" ? "Adding" : "Removing"} role ${role.name} for ${affected} members.`,
      caseId: "N/A",
    });
  },
};

export default command;