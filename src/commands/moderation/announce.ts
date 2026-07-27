import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
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

  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription(
      "Send an announcement.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild,
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "Channel to send the announcement.",
        )
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription(
          "Announcement title.",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription(
          "Announcement message.",
        )
        .setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    const channel =
      interaction.options.getChannel(
        "channel",
        true,
      );

    const title =
      interaction.options.getString(
        "title",
        true,
      );

    const message =
      interaction.options.getString(
        "message",
        true,
      );

    if (
      !channel.isTextBased() ||
      !("send" in channel)
    ) {
      await interaction.reply({
        content:
          "❌ Invalid announcement channel.",
        ephemeral: true,
      });

      return;
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(title)
        .setDescription(message)
        .setFooter({
          text: `Announcement by ${interaction.user.tag}`,
        })
        .setTimestamp();

    await channel.send({
      embeds: [embed],
    });

    await interaction.reply({
      content:
        "✅ Announcement sent.",
      ephemeral: true,
    });
  },
};

export default command;