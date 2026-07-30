import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeWhitelistService from "../../services/antiNukeWhitelistService.js";
import { Permission, type Command } from "../../types/Command.js";
import { isHighlyTrusted } from "../../utils/auth.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("whitelist-remove")
    .setDescription("Remove a whitelist entry (Owner/Co-Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User").setRequired(true))
    .addStringOption(opt => opt.setName("category").setDescription("Category").setRequired(true)),

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
    const category = interaction.options.getString("category", true);

    await antiNukeWhitelistService.remove(interaction.guild.id, user.id, category);
    await interaction.reply({ content: `✅ Removed \`${category}\` from **${user.tag}**.`, ephemeral: true });
  },
};