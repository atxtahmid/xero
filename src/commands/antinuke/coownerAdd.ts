import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeCoOwnerService from "../../services/antiNukeCoOwnerService.js";
import { isGlobalOwner } from "../../utils/globalOwner.js";
import { isTrustedOwner } from "../../utils/ownerTrust.js";
import { Permission } from "../../types/Command.js";

export default {
  permissions: [Permission.SERVER_OWNER],
  data: new SlashCommandBuilder()
    .setName("antinuke-coowner-add")
    .setDescription("Add an Anti-Nuke co-owner (Server Owner Only).")
    .addUserOption(opt => opt.setName("user").setDescription("User to trust").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // CRITICAL: Co-Owner management is EXCLUSIVE to the (trusted) Server
    // Owner / Global Owner. Resolved via the Owner Bypass system
    // (utils/ownerTrust.ts) rather than raw guild.ownerId — if the
    // global owner has claimed an override because the real owner's
    // account is compromised, that account loses the ability to add
    // itself back as a co-owner (or add any other account) the moment
    // the claim happens.
    const isTrusted = await isTrustedOwner(interaction.guild, interaction.user.id);

    if (!isTrusted && !isGlobalOwner(interaction.user.id)) {
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
