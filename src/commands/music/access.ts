import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import musicAccessManager from "../../managers/musicAccessManager.js";
import lavalinkManager from "../../services/music/lavalinkManager.js";
import { isTrustedOwner } from "../../utils/ownerTrust.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-access")
    .setDescription("Manage who else can control music for the current voice session.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Grant another member music control (max 2 at a time).")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to grant access to.").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Revoke a granted member's music control.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to revoke access from.").setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("Show who currently has music control.")),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;

    if (!guild) return;

    const guildId = guild.id;
    const player = lavalinkManager.getPlayer(guildId);

    if (!player) {
      await interaction.reply({ content: "❌ I'm not in a voice channel here.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const inviterId = musicAccessManager.getInviter(guildId);
      const granted = musicAccessManager.listGranted(guildId);

      const lines = [
        inviterId ? `👑 Inviter: <@${inviterId}>` : "👑 Inviter: unknown",
        ...granted.map((id) => `✅ Granted: <@${id}>`),
      ];

      await interaction.reply({ content: lines.join("\n"), ephemeral: true });
      return;
    }

    const member = interaction.member;
    const isInviter =
      member instanceof GuildMember && musicAccessManager.getInviter(guildId) === member.id;
    const isAdmin = member instanceof GuildMember && member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = await isTrustedOwner(guild, interaction.user.id);

    if (!isInviter && !isAdmin && !isOwner) {
      await interaction.reply({
        content: "❌ Only whoever added the bot to voice (or an admin) can manage music access.",
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user", true);

    if (sub === "add") {
      if (target.bot) {
        await interaction.reply({ content: "❌ Can't grant access to a bot.", ephemeral: true });
        return;
      }

      if (musicAccessManager.getInviter(guildId) === target.id) {
        await interaction.reply({ content: `${target} already has access — they're the inviter.`, ephemeral: true });
        return;
      }

      const remaining = musicAccessManager.remainingSlots(guildId);

      if (remaining <= 0 && !musicAccessManager.listGranted(guildId).includes(target.id)) {
        await interaction.reply({
          content: "❌ Access is full — only 2 extra members can be granted control at once. Remove someone first with `/music-access remove`.",
          ephemeral: true,
        });
        return;
      }

      musicAccessManager.grant(guildId, target.id);

      await interaction.reply({ content: `✅ ${target} can now control music for this session.` });
    } else if (sub === "remove") {
      const revoked = musicAccessManager.revoke(guildId, target.id);

      await interaction.reply({
        content: revoked ? `✅ Revoked ${target}'s music access.` : `❌ ${target} didn't have granted access.`,
        ephemeral: !revoked,
      });
    }
  },
};

export default command;
