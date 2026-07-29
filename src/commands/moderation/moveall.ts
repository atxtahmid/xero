import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";

import logger from "../../services/logger.js";

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
    if (!interaction.guild) {
      await interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });

      return;
    }

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

    if (from.id === to.id) {
      await interaction.reply({
        content:
          "❌ Source and destination channels must be different.",
        ephemeral: true,
      });

      return;
    }

    const members = [
      ...from.members.values(),
    ];

    logger.info(
      `[MOVEALL] Source=${from.name} Members=${members.length}`,
    );

    if (members.length === 0) {
      await interaction.reply({
        content:
          "❌ The source voice channel has no members.",
        ephemeral: true,
      });

      return;
    }

    let moved = 0;

    for (const member of members) {
      logger.info(
        `[MOVEALL] Attempting ${member.user.tag} (${member.id})`,
      );

      try {
        await member.voice.setChannel(
          to,
        );

        moved++;

        logger.info(
          `[MOVEALL] Success ${member.user.tag}`,
        );
      } catch (error) {
        logger.error(
          `[MOVEALL] Failed ${member.user.tag}`,
          error,
        );
      }
    }

    logger.info(
      `[MOVEALL] Finished. Moved=${moved}/${members.length}`,
    );

    await interaction.reply({
      content: `✅ Moved **${moved}** member(s) to ${to}.`,
    });
  },
};

export default command;