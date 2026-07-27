import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("antinuke-settings")
    .setDescription(
      "View Anti-Nuke settings.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      return interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });
    }

    const settings =
      await antiNukeSettingsService.get(
        interaction.guild.id,
      );

    if (!settings) {
      return interaction.reply({
        content:
          "⚠️ Anti-Nuke has not been configured yet.\nUse `/antinuke-enable` first.",
        ephemeral: true,
      });
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
          "🛡️ Anti-Nuke Settings",
        )
        .addFields(
          {
            name: "Status",
            value: settings.enabled
              ? "✅ Enabled"
              : "❌ Disabled",
            inline: true,
          },
          {
            name: "Punishment",
            value:
              settings.punishment,
            inline: true,
          },
          {
            name: "Protections",
            value: [
              `Bot Add: ${settings.antiBotAdd ? "✅" : "❌"}`,
              `Mass Ban: ${settings.antiMassBan ? "✅" : "❌"}`,
              `Mass Kick: ${settings.antiMassKick ? "✅" : "❌"}`,
              `Channel Delete: ${settings.antiChannelDelete ? "✅" : "❌"}`,
              `Channel Create: ${settings.antiChannelCreate ? "✅" : "❌"}`,
              `Channel Update: ${settings.antiChannelUpdate ? "✅" : "❌"}`,
              `Role Delete: ${settings.antiRoleDelete ? "✅" : "❌"}`,
              `Role Create: ${settings.antiRoleCreate ? "✅" : "❌"}`,
              `Role Update: ${settings.antiRoleUpdate ? "✅" : "❌"}`,
              `Webhook Create: ${settings.antiWebhookCreate ? "✅" : "❌"}`,
              `Server Update: ${settings.antiServerUpdate ? "✅" : "❌"}`,
            ].join("\n"),
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