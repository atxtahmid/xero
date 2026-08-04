import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import backupService from "../../services/backup/backupService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";

const cooldowns = new Map<string, number>();
const COOLDOWN_TIME = 1000 * 60 * 60; // 1 Hour

export default {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName("backup-create")
    .setDescription("Create a manual server backup (Owner/Co-Owner Only)."),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: Only the **Server Owner** or **Co-Owners** can manage server snapshots.", 
        ephemeral: true 
      });
      return;
    }

    const lastRun = cooldowns.get(interaction.guild.id) || 0;
    if (Date.now() - lastRun < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (Date.now() - lastRun)) / (1000 * 60));
      return interaction.reply({ content: `⏳ Please wait **${remaining} minutes** before creating another manual backup.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await backupService.createBackup(interaction.guild);
      await backupService.deleteOldBackups(interaction.guild.id);
      cooldowns.set(interaction.guild.id, Date.now());
      await interaction.editReply({ content: "✅ Manual server backup created successfully." });
    } catch (error) {
      await interaction.editReply({ content: "❌ Failed to create backup." });
    }
  },
};