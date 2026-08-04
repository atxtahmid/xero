import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import db from "../../database/prisma.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("backup-list")
    .setDescription("List server backups (Owner/Co-Owner Only)."),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: Only the **Server Owner** or **Co-Owners** can manage server snapshots.", 
        ephemeral: true 
      });
      return;
    }

    const backups = await db.guildBackup.findMany({
      where: { guildId: interaction.guild.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { roles: true, channels: true } } },
    });

    if (backups.length === 0) return interaction.reply({ content: "❌ No backups found.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2).setTitle("📦 Server Backups").setTimestamp();

    backups.forEach((b) => {
      embed.addFields({
        name: `ID: ${b.id}`,
        value: `<t:${Math.floor(b.createdAt.getTime() / 1000)}:F>\nRoles: \`${b._count.roles}\` | Channels: \`${b._count.channels}\``,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};