import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription("Voice moderation commands.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mute")
        .setDescription("Mute a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to mute.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unmute")
        .setDescription("Unmute a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to unmute.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deafen")
        .setDescription("Deafen a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to deafen.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("undeafen")
        .setDescription("Undeafen a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to undeafen.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disconnect")
        .setDescription("Disconnect a member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to disconnect.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("move")
        .setDescription("Move a member to another voice channel.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member to move.").setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Destination voice channel.")
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(true)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    if (!member) {
      await interaction.reply({ content: "❌ Member not found.", ephemeral: true });
      return;
    }

    const check = canModerate(interaction, member);
    if (!check.success) {
      await interaction.reply({ content: check.message!, ephemeral: true });
      return;
    }

    if (!member.voice.channel) {
      await interaction.reply({ content: "❌ That member is not in a voice channel.", ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    let action = "";

    try {
      switch (subcommand) {
        case "mute":
          await member.voice.setMute(true);
          action = "Voice Mute";
          break;
        case "unmute":
          await member.voice.setMute(false);
          action = "Voice Unmute";
          break;
        case "deafen":
          await member.voice.setDeaf(true);
          action = "Voice Deafen";
          break;
        case "undeafen":
          await member.voice.setDeaf(false);
          action = "Voice Undeafen";
          break;
        case "disconnect":
          await member.voice.disconnect();
          action = "Voice Disconnect";
          break;
        case "move": {
          const channel = interaction.options.getChannel("channel", true) as VoiceBasedChannel;
          const me = interaction.guild.members.me;
          if (!me?.permissionsIn(channel).has(PermissionFlagsBits.MoveMembers)) {
            return interaction.reply({ content: `❌ I need **Move Members** permission in ${channel}.`, ephemeral: true });
          }
          await member.voice.setChannel(channel);
          action = `Voice Move (${channel.name})`;
          break;
        }
      }

      await interaction.reply({ content: `✅ Action **${subcommand}** successful for ${member}.` });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser,
        action: action,
        reason: "Voice moderation action applied via command.",
        caseId: "N/A",
      });
    } catch (error) {
      console.error("[Voice Command] Error:", error);
      await interaction.reply({ content: "❌ Failed to apply voice action. Check my permissions.", ephemeral: true });
    }
  },
};

export default command;