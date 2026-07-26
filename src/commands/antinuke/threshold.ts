import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";
import {
  PermissionLevel,
  requirePermission,
} from "../../utils/permissions.js";

const actionMap: Record<string, string> = {
  bot_add: "botAddThreshold",

  mass_ban: "massBanThreshold",
  mass_kick: "massKickThreshold",

  channel_delete: "channelDeleteThreshold",
  channel_create: "channelCreateThreshold",
  channel_update: "channelUpdateThreshold",

  role_delete: "roleDeleteThreshold",
  role_create: "roleCreateThreshold",
  role_update: "roleUpdateThreshold",

  webhook_create: "webhookCreateThreshold",

  server_update: "serverUpdateThreshold",
};

const command: Command = {
  permissions: [PermissionLevel.ADMIN],

  data: new SlashCommandBuilder()
    .setName("antinuke-threshold")
    .setDescription("Configure Anti-Nuke thresholds.")

    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Action")
        .setRequired(true)
        .addChoices(
          { name: "Bot Add", value: "bot_add" },

          { name: "Mass Ban", value: "mass_ban" },
          { name: "Mass Kick", value: "mass_kick" },

          {
            name: "Channel Delete",
            value: "channel_delete",
          },
          {
            name: "Channel Create",
            value: "channel_create",
          },
          {
            name: "Channel Update",
            value: "channel_update",
          },

          {
            name: "Role Delete",
            value: "role_delete",
          },
          {
            name: "Role Create",
            value: "role_create",
          },
          {
            name: "Role Update",
            value: "role_update",
          },

          {
            name: "Webhook Create",
            value: "webhook_create",
          },

          {
            name: "Server Update",
            value: "server_update",
          },
        ),
    )

    .addIntegerOption((option) =>
      option
        .setName("value")
        .setDescription("Threshold (1-20)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(20),
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (
      !(await requirePermission(
        interaction,
        PermissionLevel.ADMIN,
      ))
    ) {
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

    const action =
      interaction.options.getString(
        "action",
        true,
      );

    const value =
      interaction.options.getInteger(
        "value",
        true,
      );

    const field = actionMap[action];

    await antiNukeSettingsService.setThreshold(
      interaction.guild.id,
      field,
      value,
    );

    await interaction.reply({
      content: `✅ Updated **${action.replaceAll("_", " ")}** threshold to **${value}**.`,
      ephemeral: true,
    });
  },
};

export default command;