import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
} from "discord.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 10,

  data: (new SlashCommandBuilder()
    .setName("massrole")
    .setDescription(
      "Add or remove a role from multiple members.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageRoles,
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription(
          "Add a role to everyone.",
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription(
              "Role to add.",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription(
          "Remove a role from everyone.",
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription(
              "Role to remove.",
            )
            .setRequired(true),
        ),
    )) as SlashCommandBuilder,

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

    await interaction.deferReply();

    const role =
      interaction.options.getRole(
        "role",
        true,
      );

    if (!(role instanceof Role)) {
      await interaction.editReply({
        content:
          "❌ Invalid role.",
      });

      return;
    }

    const me =
      interaction.guild.members.me;

    if (
      !me ||
      me.roles.highest.position <=
        role.position
    ) {
      await interaction.editReply({
        content:
          "❌ I can't manage that role.",
      });

      return;
    }

    const subcommand =
      interaction.options.getSubcommand();

    let affected = 0;

    for (const member of interaction.guild.members.cache.values()) {
      if (
        member.user.bot ||
        member.roles.highest.position >=
          me.roles.highest.position
      ) {
        continue;
      }

      try {
        if (subcommand === "add") {
          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role);

            affected++;
          }
        } else {
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);

            affected++;
          }
        }
      } catch {
        // Ignore members that cannot be modified.
      }
    }

    await interaction.editReply({
      content:
        subcommand === "add"
          ? `✅ Added ${role} to **${affected}** member(s).`
          : `✅ Removed ${role} from **${affected}** member(s).`,
    });
  },
};

export default command;