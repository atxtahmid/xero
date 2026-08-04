import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { PunishmentType } from "@prisma/client";
import { Permission, type Command } from "../../types/Command.js";
import antiNukeSettingsService from "../../services/antinuke/antiNukeSettingsService.js";
import { isHighlyTrusted } from "../../utils/auth.js";
import { sendModLog } from "../../services/moderation/modLogService.js";

const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("antinuke-punishment")
    .setDescription("Set the Anti-Nuke punishment (Owner/Co-Owner Only).")
    .addStringOption(opt => 
      opt.setName("type").setDescription("Punishment to apply").setRequired(true)
      .addChoices(
        { name: "Remove Roles", value: PunishmentType.REMOVE_ROLES },
        { name: "Timeout", value: PunishmentType.TIMEOUT },
        { name: "Kick", value: PunishmentType.KICK },
        { name: "Ban", value: PunishmentType.BAN }
      )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.", 
        ephemeral: true 
      });
      return;
    }

    const type = interaction.options.getString("type", true) as PunishmentType;
    await interaction.deferReply({ ephemeral: true });

    await antiNukeSettingsService.setPunishment(interaction.guild.id, type);
    await interaction.editReply({ content: `✅ Anti-Nuke punishment updated to: **${type}**` });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: interaction.user,
      action: "Anti-Nuke Config",
      reason: `Punishment changed to ${type}`,
      caseId: "N/A"
    });
  },
};
export default command;