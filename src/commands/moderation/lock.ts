import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import {
  Permission,
  type Command,
} from "../../types/Command.js";

import {
  lockChannel,
} from "../../utils/channelLock.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock channels.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels,
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("current")
        .setDescription(
          "Lock the current channel.",
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription(
          "Lock a specific channel.",
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "Channel to lock.",
            )
            .addChannelTypes(
              ChannelType.GuildText,
            )
            .setRequired(true),
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("all")
        .setDescription(
          "Lock every text channel.",
        ),
    ),

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

    await interaction.deferReply();

    const subcommand =
      interaction.options.getSubcommand();

    if (subcommand === "current") {
      if (
        !interaction.channel ||
        interaction.channel.type !==
          ChannelType.GuildText
      ) {
        await interaction.editReply(
          "❌ This isn't a text channel.",
        );

        return;
      }

      await lockChannel(
        interaction.channel,
      );

      await interaction.editReply(
        "🔒 Current channel locked.",
      );

      return;
    }

    if (subcommand === "channel") {
      const channel =
        interaction.options.getChannel(
          "channel",
          true,
        );

      if (
        channel.type !==
        ChannelType.GuildText
      ) {
        await interaction.editReply(
          "❌ Invalid channel.",
        );

        return;
      }

      await lockChannel(channel);

      await interaction.editReply(
        `🔒 ${channel} locked.`,
      );

      return;
    }

    let count = 0;

    for (const channel of interaction.guild.channels.cache.values()) {
      if (
        channel.type !==
        ChannelType.GuildText
      ) {
        continue;
      }

      try {
        await lockChannel(channel);

        count++;
      } catch {}
    }

    await interaction.editReply(
      `🔒 Locked **${count}** channel(s).`,
    );
  },
};

export default command;