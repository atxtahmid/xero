import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeCoOwnerService from "../../services/antiNukeCoOwnerService.js";
import { isGlobalOwner } from "../../utils/globalOwner.js";
import { isTrustedOwner } from "../../utils/ownerTrust.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-remove")
    .setDescription("Remove an Anti-Nuke co-owner (Server Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User to remove").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // Same resolution as coownerAdd.ts — see the comment there. This one
    // matters just as much: a compromised owner who could still remove
    // legitimate co-owners could clear out everyone capable of noticing
    // the compromise.
    const isTrusted = await isTrustedOwner(interaction.guild, interaction.user.id);

    if (!isTrusted && !isGlobalOwner(interaction.user.id)) {
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
