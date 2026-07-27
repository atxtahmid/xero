import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  NewsChannel,
} from "discord.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 3,

  data: (
    new SlashCommandBuilder()
      .setName("slowmode")
      .setDescription(
        "Set the slowmode for a channel.",
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageChannels,
      )
      .addIntegerOption((option) =>
        option
          .setName("seconds")
          .setDescription(
            "Slowmode duration (0-21600 seconds).",
          )
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(21600),
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(
            "Channel to modify.",
          )
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
          ),
      )
  ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

    const selected =
      interaction.options.getChannel(
        "channel",
      );

    const channel = (
      selected ??
      interaction.channel
    ) as
      | TextChannel
      | NewsChannel
      | null;

    if (!channel) {
      await interaction.reply({
        content:
          "❌ Invalid text channel.",
        ephemeral: true,
      });

      return;
    }

    const me =
      interaction.guild.members.me;

    if (
      !me?.permissions.has(
        PermissionFlagsBits.ManageChannels,
      )
    ) {
      await interaction.reply({
        content:
          "❌ I need the **Manage Channels** permission.",
        ephemeral: true,
      });

      return;
    }

    const seconds =
      interaction.options.getInteger(
        "seconds",
        true,
      );

    await channel.setRateLimitPerUser(
      seconds,
    );

    await interaction.reply({
      content:
        seconds === 0
          ? `✅ Slowmode disabled for ${channel}.`
          : `🐢 Slowmode set to **${seconds} second(s)** for ${channel}.`,
    });
  },
};

export default command;