import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeCoOwnerService from "../../services/antiNukeCoOwnerService.js";
import { isGlobalOwner } from "../../utils/globalOwner.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-add")
    .setDescription("Add an Anti-Nuke co-owner (Server Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User to trust").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // CRITICAL: Co-Owner management is EXCLUSIVE to the Server Owner / Global Owner
    if (interaction.user.id !== interaction.guild.ownerId && !isGlobalOwner(interaction.user.id)) {
      return interaction.reply({ 
        content: "❌ Security Risk: Only the **Server Owner** can grant Co-Owner status.", 
        ephemeral: true 
      });
    }

    const user = interaction.options.getUser("user", true);
    if (user.bot) return interaction.reply({ content: "❌ Bots cannot be Co-Owners.", ephemeral: true });

    try {
      await antiNukeCoOwnerService.add(interaction.guild.id, user.id);
      await interaction.reply({ content: `✅ **${user.tag}** is now an Anti-Nuke Co-Owner (Super-User).`, ephemeral: true });
    } catch (error: any) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
    }
  },
};