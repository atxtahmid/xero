import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../database/prisma.js";
import { Permission, type Command } from "../../types/Command.js";
import { isGlobalOwner } from "../../utils/globalOwner.js";

// Owner Bypass — for exactly one scenario: the real Discord guild owner's
// account is compromised (hacked). Discord itself will always let that
// account act with full owner power directly in the Discord client — no
// bot can prevent that. What this DOES fully control: every trust
// decision THIS BOT makes (Anti-Nuke's owner exemption, isHighlyTrusted(),
// command permission bypasses, moderation hierarchy bypasses, co-owner
// management gates — see utils/ownerTrust.ts for the full list of call
// sites this affects).
//
// Restricted to the GLOBAL bot owner only — deliberately not extended to
// co-owners, since a co-owner could themselves be the attacker, and
// letting any co-owner "claim" trust away from the real owner would just
// hand them exactly that power.
const command: Command = {
  permissions: [Permission.GLOBAL_OWNER],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("owner-bypass")
    .setDescription("Override which user this bot trusts as the server owner (Bot Owner Only).")
    .addSubcommand((s) =>
      s
        .setName("claim")
        .setDescription("Stop trusting the real owner; trust a different user instead.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user this bot should trust as owner instead")
            .setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("release")
        .setDescription("Clear the override; go back to trusting the real Discord owner."),
    )
    .addSubcommand((s) =>
      s.setName("status").setDescription("Check whether an override is currently active."),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    // Defense-in-depth: the outer permission gate already restricts this
    // to Permission.GLOBAL_OWNER, but this command is sensitive enough to
    // double-check explicitly, matching how other critical commands in
    // this codebase are written.
    if (!isGlobalOwner(interaction.user.id)) {
      await interaction.reply({
        content: "❌ Access Denied: This command is restricted to the bot's global owner.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "status") {
      const settings = await db.guildSettings.findUnique({
        where: { guildId: guild.id },
        select: { trustedOwnerId: true },
      });

      if (!settings?.trustedOwnerId) {
        await interaction.reply({
          content: `🔓 No override active — this bot currently trusts the real Discord owner (<@${guild.ownerId}>).`,
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `🔒 Override active. This bot currently trusts <@${settings.trustedOwnerId}> instead of the real Discord owner (<@${guild.ownerId}>), who is now treated as an ordinary member by every trust check.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "release") {
      await db.guildSettings.updateMany({
        where: { guildId: guild.id },
        data: { trustedOwnerId: null },
      });

      await interaction.reply({
        content: `🔓 Override cleared. This bot now trusts the real Discord owner (<@${guild.ownerId}>) again.`,
        ephemeral: true,
      });
      return;
    }

    // sub === "claim"
    const user = interaction.options.getUser("user", true);

    if (user.bot) {
      await interaction.reply({
        content: "❌ A bot account cannot be claimed as the trusted owner.",
        ephemeral: true,
      });
      return;
    }

    if (user.id === guild.ownerId) {
      await interaction.reply({
        content: "❌ That's already the real Discord owner — there's nothing to override. Use `release` if you meant to clear an existing claim.",
        ephemeral: true,
      });
      return;
    }

    await db.guildSettings.upsert({
      where: { guildId: guild.id },
      update: { trustedOwnerId: user.id },
      create: { guildId: guild.id, trustedOwnerId: user.id },
    });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔒 Owner Bypass Claimed")
      .setDescription(
        `The real Discord owner (<@${guild.ownerId}>) is now treated as an **ordinary member** by every trust check this bot makes — Anti-Nuke's owner exemption, Anti-Nuke settings/co-owner management, and command permission bypasses.\n\n` +
        `This bot now trusts **${user.tag}** (<@${user.id}>) instead.\n\n` +
        `Note: Discord itself still lets the real owner's account act with full owner power directly in the Discord client — this only controls what this bot trusts, not Discord's own permission model.`,
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
