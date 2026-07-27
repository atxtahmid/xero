import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
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

  cooldown: 10,

  data: new SlashCommandBuilder()
    .setName("clone")
    .setDescription(
      "Clone the current text channel.",
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels,
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (
      !interaction.guild ||
      !interaction.channel ||
      interaction.channel.type !==
        ChannelType.GuildText
    ) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a text channel.",
        ephemeral: true,
      });

      return;
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    const oldChannel =
      interaction.channel as TextChannel;

    const clone =
      await oldChannel.clone({
        name: oldChannel.name,
        reason: `Channel cloned by ${interaction.user.tag}`,
      });

    await clone.setParent(
      oldChannel.parentId,
      {
        lockPermissions: false,
      },
    );

    await clone.setPosition(
      oldChannel.position,
    );

    await oldChannel.delete(
      `Channel cloned by ${interaction.user.tag}`,
    );

    await clone.send({
      content: [
        "🧬 **Channel cloned successfully.**",
        "",
        `Cloned by: ${interaction.user}`,
      ].join("\n"),
    });

    await interaction.followUp({
      content:
        `✅ ${clone} has replaced the original channel.`,
      ephemeral: true,
    });
  },
};

export default command;