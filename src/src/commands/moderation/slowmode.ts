import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set the slowmode for a channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) =>
      option
        .setName("seconds")
        .setDescription("Slowmode duration (0-21600 seconds).")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to modify.")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildVoice,
          ChannelType.PublicThread,
          ChannelType.PrivateThread
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const selected = interaction.options.getChannel("channel");
    const channel = selected ?? interaction.channel;

    if (!channel || !("setRateLimitPerUser" in channel)) {
      await interaction.reply({
        content: "❌ This channel type does not support slowmode.",
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissionsIn(channel as any).has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ I need the **Manage Channels** permission in that channel.",
        ephemeral: true,
      });
      return;
    }

    const seconds = interaction.options.getInteger("seconds", true);

    try {
      await (channel as any).setRateLimitPerUser(seconds);

      const status = seconds === 0 ? "Disabled" : `${seconds}s`;
      
      await interaction.reply({
        content: `✅ Slowmode set to **${status}** for ${channel}.`,
      });

      // Send ModLog
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.user, // Generic context
        action: "Slowmode",
        reason: `Set slowmode to ${status} in <#${channel.id}>.`,
        caseId: "N/A",
      });
    } catch (error) {
      console.error("[Slowmode Command] Error:", error);
      await interaction.reply({
        content: "❌ Failed to update slowmode. Check my permissions.",
        ephemeral: true,
      });
    }
  },
};

export default command;