import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import guildSettingsService from "../../services/database/guildSettingsService.js";
import { Permission, type Command } from "../../types/Command.js";

const MESSAGE_MAX_LENGTH = 1000;

const command: Command = {
  permissions: [Permission.CONFIG],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("settings-welcome")
    .setDescription("Configure welcome messages, leave messages, and auto-role.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription("Set the channel used for both welcome and leave messages.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to post welcome/leave messages in.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("message")
        .setDescription("Set the welcome message. Use {user} and {server} as placeholders.")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("e.g. Welcome {user} to {server}!")
            .setMaxLength(MESSAGE_MAX_LENGTH)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leave-message")
        .setDescription("Set the leave message. Use {user} and {server} as placeholders.")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("e.g. {user} has left {server}.")
            .setMaxLength(MESSAGE_MAX_LENGTH)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("autorole")
        .setDescription("Set the role automatically given to new members on join.")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to auto-assign on join.")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Clear one (or all) of the welcome/leave/autorole settings.")
        .addStringOption((option) =>
          option
            .setName("target")
            .setDescription("What to clear.")
            .setRequired(true)
            .addChoices(
              { name: "Channel", value: "channel" },
              { name: "Welcome Message", value: "welcome-message" },
              { name: "Leave Message", value: "leave-message" },
              { name: "Auto-Role", value: "autorole" },
              { name: "Everything", value: "all" },
            ),
        ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel", true);

      await guildSettingsService.setWelcomeChannel(guildId, channel.id);

      await interaction.editReply({
        content: `✅ Welcome/leave channel set to ${channel}.\n\n⚠️ Messages won't actually send until you also set a message with \`/settings-welcome message\` (and \`/settings-welcome leave-message\` if you want leave messages too) — the channel alone isn't enough.`,
      });
      return;
    }

    if (sub === "message") {
      const text = interaction.options.getString("text", true);

      await guildSettingsService.setWelcomeMessage(guildId, text);

      await interaction.editReply({
        content: `✅ Welcome message set:\n> ${text}\n\n⚠️ This won't send until a channel is also set with \`/settings-welcome channel\`.`,
      });
      return;
    }

    if (sub === "leave-message") {
      const text = interaction.options.getString("text", true);

      await guildSettingsService.setLeaveMessage(guildId, text);

      await interaction.editReply({
        content: `✅ Leave message set:\n> ${text}\n\n⚠️ This won't send until a channel is also set with \`/settings-welcome channel\`.`,
      });
      return;
    }

    if (sub === "autorole") {
      const role = interaction.options.getRole("role", true);
      const me = interaction.guild.members.me;

      // Checked here, at config time, rather than only discovering it via
      // a warning buried in bot logs the next time someone actually
      // joins — this is exactly the "feature silently does nothing"
      // failure mode this command exists to close.
      if (role.managed) {
        await interaction.editReply({
          content: "❌ That role is managed by an integration (a bot or boost role) and can't be assigned manually.",
        });
        return;
      }

      if (!me || role.position >= me.roles.highest.position) {
        await interaction.editReply({
          content: `❌ I can't assign ${role} — it's positioned at or above my highest role. Move my role above it in Server Settings → Roles, then try again.`,
        });
        return;
      }

      await guildSettingsService.setAutoRole(guildId, role.id);

      await interaction.editReply({
        content: `✅ Auto-role set to ${role}. New members will receive it automatically on join.`,
      });
      return;
    }

    // sub === "disable"
    const target = interaction.options.getString("target", true);

    if (target === "channel" || target === "all") {
      await guildSettingsService.setWelcomeChannel(guildId, null);
    }

    if (target === "welcome-message" || target === "all") {
      await guildSettingsService.setWelcomeMessage(guildId, null);
    }

    if (target === "leave-message" || target === "all") {
      await guildSettingsService.setLeaveMessage(guildId, null);
    }

    if (target === "autorole" || target === "all") {
      await guildSettingsService.setAutoRole(guildId, null);
    }

    await interaction.editReply({
      content:
        target === "all"
          ? "✅ Welcome channel, welcome message, leave message, and auto-role all cleared."
          : `✅ Cleared: ${target.replace("-", " ")}.`,
    });
  },
};

export default command;
