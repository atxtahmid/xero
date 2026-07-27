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

  data: (new SlashCommandBuilder()
    .setName("role")
    .setDescription(
      "Add or remove a role from a member.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageRoles,
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription(
          "Add a role to a member.",
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription(
              "Member.",
            )
            .setRequired(true),
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
          "Remove a role from a member.",
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription(
              "Member.",
            )
            .setRequired(true),
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

    const role =
      interaction.options.getRole(
        "role",
        true,
      );

    if (!(role instanceof Role)) {
      await interaction.reply({
        content:
          "❌ Invalid role.",
        ephemeral: true,
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
      await interaction.reply({
        content:
          "❌ I can't manage that role.",
        ephemeral: true,
      });

      return;
    }

    const subcommand =
      interaction.options.getSubcommand();

    if (subcommand === "add") {
      if (member.roles.cache.has(role.id)) {
        await interaction.reply({
          content:
            "❌ Member already has that role.",
          ephemeral: true,
        });

        return;
      }

      await member.roles.add(role);

      await interaction.reply({
        content:
          `✅ Added ${role} to ${member}.`,
      });

      return;
    }

    if (!member.roles.cache.has(role.id)) {
      await interaction.reply({
        content:
          "❌ Member doesn't have that role.",
        ephemeral: true,
      });

      return;
    }

    await member.roles.remove(role);

    await interaction.reply({
      content:
        `✅ Removed ${role} from ${member}.`,
    });
  },
};

export default command;