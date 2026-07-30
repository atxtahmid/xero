import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeCoOwnerService from "../../services/antiNukeCoOwnerService.js";
import { isGlobalOwner } from "../../utils/globalOwner.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-remove")
    .setDescription("Remove an Anti-Nuke co-owner (Server Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User to remove").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // CRITICAL: Co-Owner management is EXCLUSIVE to the Server Owner / Global Owner
    if (interaction.user.id !== interaction.guild.ownerId && !isGlobalOwner(interaction.user.id)) {
      return interaction.reply({ 
        content: "❌ Security Risk: Only the **Server Owner** can revoke Co-Owner status.", 
        ephemeral: true 
      });
    }

    const user = interaction.options.getUser("user", true);
    await antiNukeCoOwnerService.remove(interaction.guild.id, user.id);
    await interaction.reply({ content: `✅ **${user.tag}** removed from Co-Owners.`, ephemeral: true });
  },
};