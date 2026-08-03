import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";
import logger from "../../services/logger.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send the announcement.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Announcement title.").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("Announcement message.").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    const title = interaction.options.getString("title", true);
    const message = interaction.options.getString("message", true);

    // 1. Bot Permission Check
    const me = interaction.guild.members.me;
    if (!me?.permissionsIn(channel).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      await interaction.reply({
        content: `❌ I need **Send Messages** and **Embed Links** permissions in ${channel}.`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setDescription(message)
      .setFooter({ text: `Announcement by ${interaction.user.tag}` })
      .setTimestamp();

    try {
      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] }, // Safety
      });

      await interaction.reply({ content: "✅ Announcement sent.", ephemeral: true });

      // 2. Log trail
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.user,
        action: "Announcement",
        reason: `Sent announcement to <#${channel.id}>: ${title}`,
        caseId: "N/A",
      });
    } catch (error) {
      logger.error("[Announce Command] Error:", error);
      await interaction.reply({ content: "❌ Failed to send announcement.", ephemeral: true });
    }
  },
};

export default command;