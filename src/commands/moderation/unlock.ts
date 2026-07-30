import { TextChannel } from "discord.js";

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
  unlockChannel,
} from "../../utils/channelLock.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 5,

  data: (
    new SlashCommandBuilder()
      .setName("unlock")
      .setDescription("Unlock channels.")
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageChannels,
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("current")
          .setDescription(
            "Unlock the current channel.",
          ),
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("channel")
          .setDescription(
            "Unlock a specific channel.",
          )
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription(
                "Channel to unlock.",
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
            "Unlock every text channel.",
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

      await unlockChannel(
        interaction.channel,
      );

      await interaction.editReply(
        "🔓 Current channel unlocked.",
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

      await unlockChannel(
        channel as TextChannel,
      );

      await interaction.editReply(
        `🔓 ${channel} unlocked.`,
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
        await unlockChannel(
          channel as TextChannel,
        );

        count++;
      } catch {}
    }

    await interaction.editReply(
      `🔓 Unlocked **${count}** channel(s).`,
    );
  },
};

export default command;