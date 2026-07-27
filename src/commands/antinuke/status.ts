import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";

import db from "../../services/database.js";
import {
  PermissionLevel,
  requirePermission,
} from "../../utils/permissions.js";

const command: Command = {
  permissions: [PermissionLevel.ADMIN],

  data: new SlashCommandBuilder()
    .setName("antinuke-status")
    .setDescription(
      "View the current Anti-Nuke configuration.",
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

    const settings =
      await db.antiNukeSettings.findUnique({
        where: {
          guildId: interaction.guild.id,
        },
      });

    const guildSettings =
      await db.guildSettings.findUnique({
        where: {
          guildId: interaction.guild.id,
        },
      });

    const coOwners =
      await db.antiNukeCoOwner.count({
        where: {
          guildId: interaction.guild.id,
        },
      });

    const whitelist =
      await db.antiNukeWhitelist.count({
        where: {
          guildId: interaction.guild.id,
        },
      });

    if (!settings) {
      await interaction.reply({
        content:
          "❌ Anti-Nuke has not been configured yet.",
        ephemeral: true,
      });

      return;
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
          "🛡️ Anti-Nuke Status",
        )
        .addFields(
          {
            name: "Enabled",
            value: settings.enabled
              ? "🟢 Enabled"
              : "🔴 Disabled",
            inline: true,
          },
          {
            name: "Punishment",
            value: settings.punishment,
            inline: true,
          },
          {
            name: "Log Channel",
            value:
              guildSettings?.antiNukeLogChannelId
                ? `<#${guildSettings.antiNukeLogChannelId}>`
                : "Not Configured",
            inline: true,
          },
          {
            name: "Co-Owners",
            value: `${coOwners}`,
            inline: true,
          },
          {
            name: "Whitelist Entries",
            value: `${whitelist}`,
            inline: true,
          },
          {
            name: "Protections",
            value: [
              `🟢 Bot Add: ${settings.antiBotAdd}`,
              `🟢 Mass Ban: ${settings.antiMassBan}`,
              `🟢 Mass Kick: ${settings.antiMassKick}`,
              `🟢 Channel Delete: ${settings.antiChannelDelete}`,
              `🟢 Channel Create: ${settings.antiChannelCreate}`,
              `🟢 Channel Update: ${settings.antiChannelUpdate}`,
              `🟢 Role Delete: ${settings.antiRoleDelete}`,
              `🟢 Role Create: ${settings.antiRoleCreate}`,
              `🟢 Role Update: ${settings.antiRoleUpdate}`,
              `🟢 Webhook Create: ${settings.antiWebhookCreate}`,
              `🟢 Server Update: ${settings.antiServerUpdate}`,
            ]
              .map((line) =>
                line.replace(
                  "true",
                  "Enabled",
                ).replace(
                  "false",
                  "Disabled",
                ),
              )
              .join("\n"),
          },
          {
            name: "Thresholds",
            value: [
              `Bot Add: ${settings.botAddThreshold}`,
              `Mass Ban: ${settings.massBanThreshold}`,
              `Mass Kick: ${settings.massKickThreshold}`,
              `Channel Delete: ${settings.channelDeleteThreshold}`,
              `Channel Create: ${settings.channelCreateThreshold}`,
              `Channel Update: ${settings.channelUpdateThreshold}`,
              `Role Delete: ${settings.roleDeleteThreshold}`,
              `Role Create: ${settings.roleCreateThreshold}`,
              `Role Update: ${settings.roleUpdateThreshold}`,
              `Webhook Create: ${settings.webhookCreateThreshold}`,
              `Server Update: ${settings.serverUpdateThreshold}`,
            ].join("\n"),
          },
        )
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};

export default command;