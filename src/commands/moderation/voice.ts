import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { sendModLog } from "../../services/modLogService.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription("Voice moderation.")
    .addSubcommand((s) =>
      s
        .setName("mute")
        .setDescription("Mute a member in voice.")
        .addUserOption((o) => o.setName("user").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("disconnect")
        .setDescription("Disconnect a member from voice.")
        .addUserOption((o) => o.setName("user").setRequired(true)),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    if (!member || !member.voice.channel) {
      await interaction.reply({
        content: "❌ User is not connected to a voice channel.",
        ephemeral: true,
      });
      return;
    }

    const check = canModerate(interaction, member);
    if (!check.success) {
      await interaction.reply({
        content: check.message!,
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild.members.me;

    if (!me) {
      await interaction.reply({
        content: "❌ Unable to determine my permissions.",
        ephemeral: true,
      });
      return;
    }

    if (member.roles.highest.position >= me.roles.highest.position) {
      await interaction.reply({
        content: "❌ I cannot moderate this member due to role hierarchy.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    try {
      if (sub === "mute") {
        if (!me.permissions.has(PermissionFlagsBits.MuteMembers)) {
          await interaction.reply({
            content: "❌ I need the **Mute Members** permission.",
            ephemeral: true,
          });
          return;
        }

        if (member.voice.serverMute) {
          await interaction.reply({
            content: "❌ User is already muted.",
            ephemeral: true,
          });
          return;
        }

        await member.voice.setMute(true);
      } else {
        if (!me.permissions.has(PermissionFlagsBits.MoveMembers)) {
          await interaction.reply({
            content: "❌ I need the **Move Members** permission.",
            ephemeral: true,
          });
          return;
        }

        if (!member.voice.channel) {
          await interaction.reply({
            content: "❌ User is no longer connected to voice.",
            ephemeral: true,
          });
          return;
        }

        await member.voice.disconnect();
      }

      await interaction.reply({
        content: `✅ Successfully ${sub === "mute" ? "muted" : "disconnected"} ${targetUser.tag}.`,
      });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: `Voice ${sub}`,
        reason: `Voice ${sub} via slash command`,
        caseId: "N/A",
      });
    } catch (error) {
      console.error(error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Action failed.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ Action failed.",
          ephemeral: true,
        });
      }
    }
  },
};

export default command;