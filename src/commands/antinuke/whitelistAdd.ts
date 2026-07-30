import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeWhitelistService from "../../services/antiNukeWhitelistService.js";
import { Permission, type Command } from "../../types/Command.js";
import { isHighlyTrusted } from "../../utils/auth.js";

const categories = ["ALL", "BAN", "KICK", "CHANNEL_CREATE", "CHANNEL_DELETE", "ROLE_CREATE", "ROLE_DELETE", "BOT_ADD"];

const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName("whitelist-add")
    .setDescription("Add a user to Anti-Nuke whitelist (Owner/Co-Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User to whitelist").setRequired(true))
    .addStringOption(opt => {
      opt.setName("category").setDescription("Category").setRequired(true);
      categories.forEach(c => opt.addChoices({ name: c, value: c }));
      return opt;
    }) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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

    try {
      await antiNukeWhitelistService.add(interaction.guild.id, user.id, category);
      await interaction.reply({ content: `✅ **${user.tag}** whitelisted for \`${category}\`.`, ephemeral: true });
    } catch (error: any) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
    }
  },
};
export default command;