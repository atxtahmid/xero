import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import db from "../../services/database.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("backup-info")
    .setDescription("View backup details (Owner/Co-Owner Only).")
    .addStringOption((opt) => opt.setName("id").setDescription("Backup ID").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: Only the **Server Owner** or **Co-Owners** can manage server snapshots.", 
        ephemeral: true 
      });
      return;
    }

    const id = interaction.options.getString("id", true);
    const backup = await db.guildBackup.findUnique({ where: { id }, include: { roles: true, channels: true } });

    if (!backup || backup.guildId !== interaction.guild.id) {
      return interaction.reply({ content: "❌ Backup not found.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2).setTitle(`📦 Backup: ${backup.id}`)
      .addFields(
        { name: "Created", value: `<t:${Math.floor(backup.createdAt.getTime() / 1000)}:F>`, inline: true },
        { name: "Stats", value: `• Roles: \`${backup.roles.length}\`\n• Channels: \`${backup.channels.length}\`` }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};