import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.ADMIN],
  guildOnly: true,
  cooldown: 10,

  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Create a ticket panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel where the panel will be created.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("staff")
        .setDescription("Staff role for tickets.")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("Category where tickets will be created.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("logs")
        .setDescription("Log channel for this panel.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Panel name (Max 100 chars).")
        .setMaxLength(100)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Panel description (Max 1000 chars).")
        .setMaxLength(1000)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Hex color code (e.g. #5865f2).")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel", true) as any;
    const staffRole = interaction.options.getRole("staff");
    const category = interaction.options.getChannel("category");
    const logs = interaction.options.getChannel("logs");
    const name = interaction.options.getString("name") ?? "Support";
    const description = interaction.options.getString("description");
    const colorHex = interaction.options.getString("color") ?? "#5865f2";

    // 1. Permission Check for target channel
    const me = interaction.guild.members.me;
    const targetPerms = channel.permissionsFor(me);
    if (!targetPerms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      await interaction.editReply({
        content: `❌ I do not have sufficient permissions to send embeds in ${channel}.`,
      });
      return;
    }

    // 2. Validate Color
    const color = parseInt(colorHex.replace("#", ""), 16);
    if (isNaN(color)) {
      await interaction.editReply({ content: "❌ Invalid Hex color provided." });
      return;
    }

    // 3. Database Check
    const existing = await db.ticketPanel.findUnique({
      where: {
        guildId_channelId: {
          guildId: interaction.guild.id,
          channelId: channel.id,
        },
      },
    });

    if (existing) {
      await interaction.editReply({
        content: "❌ A ticket panel is already registered for this channel.",
      });
      return;
    }

    // 4. Operation: Message first to ensure UI works
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎫 ${name}`)
      .setDescription(description ?? "Press the button below to create a ticket.")
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket:create")
        .setLabel("Create Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
    );

    try {
      const message = await channel.send({
        embeds: [embed],
        components: [row],
      });

      // 5. Operation: DB second
      await db.ticketPanel.create({
        data: {
          guildId: interaction.guild.id,
          channelId: channel.id,
          messageId: message.id,
          supportRoleId: staffRole?.id ?? null,
          categoryId: category?.id ?? null,
          logChannelId: logs?.id ?? null,
          name,
          description,
          color,
        },
      });

      await interaction.editReply({
        content: `✅ Ticket panel successfully created in ${channel}.`,
      });
    } catch (error) {
      console.error("[TicketPanel] Creation failed:", error);
      await interaction.editReply({
        content: "❌ Failed to create panel. Check bot permissions.",
      });
    }
  },
};

export default command;