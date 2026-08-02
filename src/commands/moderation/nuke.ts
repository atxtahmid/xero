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

  cooldown: 30,

  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription(
      "Completely reset the current text channel.",
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

    // Previously none of these Discord API calls were wrapped in a
    // try/catch (unlike the near-identical clone.ts, which does wrap
    // its equivalent steps) — if clone/setParent/setPosition/delete/send
    // failed partway through, the interaction would just error out with
    // no useful message, and depending on which step failed, could leave
    // the old channel deleted with no replacement ever sent.
    try {
      const newChannel =
        await oldChannel.clone({
          name: oldChannel.name,
          reason: `Channel nuked by ${interaction.user.tag}`,
        });

      await newChannel.setParent(
        oldChannel.parentId,
        {
          lockPermissions: false,
        },
      );

      await newChannel.setPosition(
        oldChannel.position,
      );

      await oldChannel.delete(
        `Channel nuked by ${interaction.user.tag}`,
      );

      await newChannel.send({
        content: [
          "# 💥 Channel Nuked",
          "",
          `This channel has been reset by ${interaction.user}.`,
          "All previous messages have been removed.",
        ].join("\n"),
      });

      await interaction.followUp({
        content:
          `✅ ${newChannel} has been recreated successfully.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("[Nuke Command] Error:", error);

      await interaction.followUp({
        content:
          "❌ Failed to nuke the channel. It may have been partially recreated — please check the channel list.",
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

export default command;
