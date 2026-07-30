import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} from "discord.js";

import restoreService from "../../services/restoreService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { Permission } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName("backup-restore")
    .setDescription("Restore the latest server backup (Owner/Co-Owner Only)."),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: Only the **Server Owner** or **Co-Owners** can manage server snapshots.", 
        ephemeral: true 
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("confirm_restore").setLabel("Yes, Restore Now").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_restore").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.reply({
      content: "⚠️ **WARNING**: Restoration is a high-impact process. Do you want to proceed?",
      components: [row],
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000 });

    collector.on("collect", async (i) => {
      if (i.customId === "cancel_restore") {
        await i.update({ content: "✅ Restoration cancelled.", components: [] });
        return collector.stop();
      }

      await i.update({ content: "⚙️ Restoration started... Please wait.", components: [] });

      try {
        await restoreService.restore(interaction.guild!);
        await interaction.editReply({ content: "✅ **Restoration Complete**." });
        await sendModLog({
          guild: interaction.guild!, moderator: interaction.user, target: interaction.user,
          action: "Server Restore", reason: "Manual trigger of server restoration.", caseId: "N/A"
        });
      } catch (error: any) {
        await interaction.editReply({ content: `❌ Restoration failed: ${error.message}` });
      }
      collector.stop();
    });
  },
};