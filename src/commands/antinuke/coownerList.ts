import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import antiNukeCoOwnerService from "../../services/antinuke/antiNukeCoOwnerService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-list")
    .setDescription("View Anti-Nuke co-owners (Trusted Users Only)."),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      return interaction.reply({ content: "❌ Access Denied.", ephemeral: true });
    }

    const coOwners = await antiNukeCoOwnerService.getAll(interaction.guild.id);

    const description = coOwners.length === 0
      ? "No Anti-Nuke co-owners configured."
      : coOwners.map((owner, index) => `${index + 1}. <@${owner.userId}> (\`${owner.userId}\`)`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Anti-Nuke Co-Owners")
      .setColor(0x5865F2)
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};