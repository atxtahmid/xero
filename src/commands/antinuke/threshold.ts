import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/Command.js";
import { Permission } from "../../types/Command.js";
import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { sendModLog } from "../../services/modLogService.js";

const fieldMap: Record<string, string> = {
  bot: "botAddThreshold", ban: "massBanThreshold", kick: "massKickThreshold",
  c_del: "channelDeleteThreshold", c_cre: "channelCreateThreshold",
  r_del: "roleDeleteThreshold", r_cre: "roleCreateThreshold"
};

const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName("antinuke-threshold")
    .setDescription("Configure thresholds (Owner/Co-Owner Only).")
    .addStringOption(opt => opt.setName("action").setDescription("Action type").setRequired(true)
      .addChoices(
        { name: "Bot Add", value: "bot" }, { name: "Mass Ban", value: "ban" },
        { name: "Mass Kick", value: "kick" }, { name: "Channel Delete", value: "c_del" },
        { name: "Role Delete", value: "r_del" }
      ))
    .addIntegerOption(opt => opt.setName("value").setDescription("Threshold count (1-20)").setMinValue(1).setMaxValue(20).setRequired(true)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.", 
        ephemeral: true 
      });
      return;
    }

    const actionKey = interaction.options.getString("action", true);
    const value = interaction.options.getInteger("value", true);
    const field = fieldMap[actionKey];

    await interaction.deferReply({ ephemeral: true });
    await antiNukeSettingsService.setThreshold(interaction.guild.id, field, value);

    await interaction.editReply({ content: `✅ Updated **${actionKey}** threshold to **${value}**.` });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: interaction.user,
      action: "Anti-Nuke Config",
      reason: `Changed ${actionKey} threshold to ${value}`,
      caseId: "N/A"
    });
  },
};
export default command;