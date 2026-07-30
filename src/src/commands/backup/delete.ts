import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import db from "../../services/database.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("backup-delete")
    .setDescription("Delete a server backup (Owner/Co-Owner Only).")
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
    const backup = await db.guildBackup.findUnique({ where: { id }, select: { guildId: true } });

    if (!backup || backup.guildId !== interaction.guild.id) {
      return interaction.reply({ content: "❌ Backup not found.", ephemeral: true });
    }

    await db.guildBackup.delete({ where: { id } });
    await interaction.reply({ content: `✅ Backup \`${id}\` deleted.`, ephemeral: true });
  },
};