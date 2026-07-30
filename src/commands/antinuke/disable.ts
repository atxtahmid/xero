import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/Command.js";
import { Permission } from "../../types/Command.js";
import antiNukeSettingsService from "../../services/antiNukeSettingsService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName("antinuke-disable")
    .setDescription("Disable the Anti-Nuke system (Owner/Co-Owner Only)."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.", 
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    await antiNukeSettingsService.disable(interaction.guild.id);

    await interaction.editReply({ content: "🛑 Anti-Nuke system has been **Disabled**." });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: interaction.user,
      action: "Anti-Nuke Config",
      reason: "Anti-Nuke system disabled.",
      caseId: "N/A"
    });
  },
};
export default command;