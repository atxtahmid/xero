import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import giveawayService from "../../services/giveaways/giveawayService.js";
import { Permission, type Command } from "../../types/Command.js";
import { formatDuration, parseDuration } from "../../utils/duration.js";

const MAX_WINNERS = 20;

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("giveaway-start")
    .setDescription("Start a giveaway.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("prize")
        .setDescription("What are you giving away?")
        .setMaxLength(200)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("How long it runs, e.g. 1h30m, 2d, 45m.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("winners")
        .setDescription(`Number of winners (default 1, max ${MAX_WINNERS}).`)
        .setMinValue(1)
        .setMaxValue(MAX_WINNERS)
        .setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to post in (default: this channel).")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addRoleOption((option) =>
      option
        .setName("required-role")
        .setDescription("Optional: role required to enter.")
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("min-account-age")
        .setDescription("Optional: minimum Discord account age, in days.")
        .setMinValue(1)
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("min-server-join")
        .setDescription("Optional: minimum days as a member of this server.")
        .setMinValue(1)
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const prize = interaction.options.getString("prize", true);
    const durationInput = interaction.options.getString("duration", true);
    const winnerCount = interaction.options.getInteger("winners") ?? 1;
    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel | null) ??
      (interaction.channel as TextChannel);
    const requiredRole = interaction.options.getRole("required-role");
    const minAccountAgeDays = interaction.options.getInteger("min-account-age");
    const minServerJoinDays = interaction.options.getInteger("min-server-join");

    const durationMs = parseDuration(durationInput);

    if (!durationMs) {
      await interaction.editReply({
        content: "❌ Couldn't parse that duration. Try something like `1h30m`, `2d`, or `45m`.",
      });
      return;
    }

    if (durationMs < 30_000) {
      await interaction.editReply({
        content: "❌ Duration must be at least 30 seconds.",
      });
      return;
    }

    if (!(targetChannel instanceof TextChannel)) {
      await interaction.editReply({
        content: "❌ That channel isn't a text channel I can post in.",
      });
      return;
    }

    const me = interaction.guild.members.me;

    if (
      !me ||
      !targetChannel
        .permissionsFor(me)
        ?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AddReactions,
        ])
    ) {
      await interaction.editReply({
        content: `❌ I need View Channel, Send Messages, Embed Links, and Add Reactions in ${targetChannel}.`,
      });
      return;
    }

    await giveawayService.create(
      interaction.guild,
      targetChannel,
      interaction.user,
      prize,
      winnerCount,
      durationMs,
      {
        requiredRoleId: requiredRole?.id ?? null,
        minAccountAgeDays,
        minServerJoinDays,
      },
    );

    await interaction.editReply({
      content: `✅ Giveaway for **${prize}** started in ${targetChannel}, running for ${formatDuration(durationMs)}.`,
    });
  },
};

export default command;
