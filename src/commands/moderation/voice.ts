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

import {
  canModerate,
  fetchMember,
} from "../../utils/moderation.js";

const command: Command = {
  permissions: [
    Permission.MODERATOR,
  ],

  guildOnly: true,

  cooldown: 3,

  data: (
    new SlashCommandBuilder()
      .setName("voice")
      .setDescription(
        "Voice moderation commands.",
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ModerateMembers,
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("mute")
          .setDescription("Mute a member.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Member to mute.")
              .setRequired(true),
          ),
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("unmute")
          .setDescription("Unmute a member.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Member to unmute.")
              .setRequired(true),
          ),
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("deafen")
          .setDescription("Deafen a member.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Member to deafen.")
              .setRequired(true),
          ),
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("undeafen")
          .setDescription("Undeafen a member.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Member to undeafen.")
              .setRequired(true),
          ),
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("disconnect")
          .setDescription("Disconnect a member.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Member to disconnect.")
              .setRequired(true),
          ),
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("move")
          .setDescription(
            "Move a member to another voice channel.",
          )
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Member to move.")
              .setRequired(true),
          )
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription(
                "Destination voice channel.",
              )
              .addChannelTypes(
                ChannelType.GuildVoice,
                ChannelType.GuildStageVoice,
              )
              .setRequired(true),
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

    const member =
      await fetchMember(
        interaction,
        interaction.options.getUser(
          "user",
          true,
        ).id,
      );

    if (!member) {
      await interaction.reply({
        content:
          "❌ Member not found.",
        ephemeral: true,
      });

      return;
    }

    const check =
      canModerate(
        interaction,
        member,
      );

    if (!check.success) {
      await interaction.reply({
        content: check.message!,
        ephemeral: true,
      });

      return;
    }

    if (!member.voice.channel) {
      await interaction.reply({
        content:
          "❌ That member is not in a voice channel.",
        ephemeral: true,
      });

      return;
    }

    const subcommand =
      interaction.options.getSubcommand();

    switch (subcommand) {
      case "mute":
        await member.voice.setMute(true);
        await interaction.reply({
          content: `🔇 Muted ${member}.`,
        });
        break;

      case "unmute":
        await member.voice.setMute(false);
        await interaction.reply({
          content: `🔊 Unmuted ${member}.`,
        });
        break;

      case "deafen":
        await member.voice.setDeaf(true);
        await interaction.reply({
          content: `🎧 Deafened ${member}.`,
        });
        break;

      case "undeafen":
        await member.voice.setDeaf(false);
        await interaction.reply({
          content: `🔈 Undeafened ${member}.`,
        });
        break;

      case "disconnect":
        await member.voice.disconnect();
        await interaction.reply({
          content: `📤 Disconnected ${member}.`,
        });
        break;

      case "move": {
        const channel =
          interaction.options.getChannel(
            "channel",
            true,
          ) as VoiceBasedChannel;

        await member.voice.setChannel(
          channel,
        );

        await interaction.reply({
          content: `➡️ Moved ${member} to ${channel}.`,
        });

        break;
      }
    }
  },
};

export default command;