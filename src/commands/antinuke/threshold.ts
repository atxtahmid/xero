import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import antiNukeSettingsService from "../../services/antinuke/antiNukeSettingsService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { sendModLog } from "../../services/moderation/modLogService.js";

const fieldMap = {
  bot: "botAddThreshold",
  ban: "massBanThreshold",
  kick: "massKickThreshold",

  c_cre: "channelCreateThreshold",
  c_del: "channelDeleteThreshold",
  c_upd: "channelUpdateThreshold",

  r_cre: "roleCreateThreshold",
  r_del: "roleDeleteThreshold",
  r_upd: "roleUpdateThreshold",

  webhook: "webhookCreateThreshold",
  server: "serverUpdateThreshold",
} as const;

const actionNames: Record<keyof typeof fieldMap, string> = {
  bot: "Bot Add",
  ban: "Mass Ban",
  kick: "Mass Kick",

  c_cre: "Channel Create",
  c_del: "Channel Delete",
  c_upd: "Channel Update",

  r_cre: "Role Create",
  r_del: "Role Delete",
  r_upd: "Role Update",

  webhook: "Webhook Create",
  server: "Server Update",
};

const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName("antinuke-threshold")
    .setDescription("Configure Anti-Nuke thresholds.")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Action type")
        .setRequired(true)
        .addChoices(
          { name: "Bot Add", value: "bot" },
          { name: "Mass Ban", value: "ban" },
          { name: "Mass Kick", value: "kick" },

          { name: "Channel Create", value: "c_cre" },
          { name: "Channel Delete", value: "c_del" },
          { name: "Channel Update", value: "c_upd" },

          { name: "Role Create", value: "r_cre" },
          { name: "Role Delete", value: "r_del" },
          { name: "Role Update", value: "r_upd" },

          { name: "Webhook Create", value: "webhook" },
          { name: "Server Update", value: "server" },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("value")
        .setDescription("Threshold (1-20)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(20),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({
        content:
          "❌ Access denied. Only the **Server Owner** and **Anti-Nuke Co-Owners** can use this command.",
        ephemeral: true,
      });
      return;
    }

    const actionKey = interaction.options.getString(
      "action",
      true,
    ) as keyof typeof fieldMap;

    const value = interaction.options.getInteger("value", true);

    const field = fieldMap[actionKey];

    await interaction.deferReply({
      ephemeral: true,
    });

    await antiNukeSettingsService.setThreshold(
      interaction.guild.id,
      field as never,
      value,
    );

    await interaction.editReply({
      content: `✅ Updated **${actionNames[actionKey]}** threshold to **${value}**.`,
    });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: interaction.user,
      action: "Anti-Nuke Config",
      reason: `Updated ${actionNames[actionKey]} threshold to ${value}`,
      caseId: "N/A",
    });
  },
};

export default command;