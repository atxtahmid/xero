import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  VoiceBasedChannel,
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

  data: (
    new SlashCommandBuilder()
      .setName("moveall")
      .setDescription(
        "Move everyone from one voice channel to another.",
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.MoveMembers,
      )
      .addChannelOption((option) =>
        option
          .setName("from")
          .setDescription(
            "Source voice channel.",
          )
          .addChannelTypes(
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
          )
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .setName("to")
          .setDescription(
            "Destination voice channel.",
          )
          .addChannelTypes(
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
          )
          .setRequired(true),
      )
  ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    const from =
      interaction.options.getChannel(
        "from",
        true,
      ) as VoiceBasedChannel;

    const to =
      interaction.options.getChannel(
        "to",
        true,
      ) as VoiceBasedChannel;

    const members = [
      ...from.members.values(),
    ];

    let moved = 0;

    for (const member of members) {
      try {
        await member.voice.setChannel(
          to,
        );

        moved++;
      } catch {}
    }

    await interaction.reply({
      content: `✅ Moved **${moved}** member(s) to ${to}.`,
    });
  },
};

export default command;