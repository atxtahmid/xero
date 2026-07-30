import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";
import db from "../../services/database.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("antinuke-settings")
    .setDescription("View the full Anti-Nuke security dashboard (Owner/Co-Owner Only)."),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.", 
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const settings = await antiNukeSettingsService.get(interaction.guild.id);
    if (!settings) {
      return interaction.editReply("⚠️ Anti-Nuke is not configured. Use `/antinuke-enable`.");
    }

    const coOwners = await db.antiNukeCoOwner.count({ where: { guildId: interaction.guild.id } });
    const whitelist = await db.antiNukeWhitelist.count({ where: { guildId: interaction.guild.id } });

    const embed = new EmbedBuilder()
      .setColor(settings.enabled ? 0x57F287 : 0xED4245)
      .setTitle("🛡️ Anti-Nuke Security Dashboard")
      .addFields(
        { name: "Status", value: settings.enabled ? "🟢 Enabled" : "🔴 Disabled", inline: true },
        { name: "Punishment", value: `\`${settings.punishment}\``, inline: true },
        { name: "Logs", value: settings.guild.settings?.antiNukeLogChannelId ? `<#${settings.guild.settings.antiNukeLogChannelId}>` : "❌ Not Set", inline: true },
        { name: "Thresholds", value: [
          `Bot Add: \`${settings.botAddThreshold}\``,
          `Mass Ban: \`${settings.massBanThreshold}\``,
          `Mass Kick: \`${settings.massKickThreshold}\``,
          `Channel Del: \`${settings.channelDeleteThreshold}\``,
          `Role Del: \`${settings.roleDeleteThreshold}\``,
        ].join("\n"), inline: true },
        { name: "Trusted Users", value: `Co-Owners: \`${coOwners}/10\`\nWhitelisted: \`${whitelist}\``, inline: true }
      )
      .setFooter({ text: "Super-User Access" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};