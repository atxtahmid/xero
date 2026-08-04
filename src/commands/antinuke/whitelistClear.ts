import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeWhitelistService from "../../services/antinuke/antiNukeWhitelistService.js";
import { Permission, type Command } from "../../types/Command.js";
import { isHighlyTrusted } from "../../utils/auth.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("whitelist-clear")
    .setDescription("Clear all whitelist entries for a user (Owner/Co-Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User to clear").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({ 
        content: "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.", 
        ephemeral: true 
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    await antiNukeWhitelistService.clear(interaction.guild.id, user.id);
    await interaction.reply({ content: `✅ All whitelist entries cleared for **${user.tag}**.`, ephemeral: true });
  },
};