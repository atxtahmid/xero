import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 15,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename the current ticket.")
    .addStringOption((o) =>
      o
        .setName("name")
        .setDescription("New ticket name")
        .setRequired(true)
        .setMaxLength(80),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.guild) return;

    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({
        content:
          "❌ This command can only be used in ticket text channels.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getByChannel(
      interaction.channelId,
    );

    if (!ticket) {
      await interaction.editReply({
        content: "❌ This is not a registered ticket.",
      });
      return;
    }

    const member = await interaction.guild.members.fetch(
      interaction.user.id,
    );

    const isSupport =
      !!ticket.panel.supportRoleId &&
      member.roles.cache.has(
        ticket.panel.supportRoleId,
      );

    const isStaff =
      member.permissions.has(
        PermissionFlagsBits.ManageChannels,
      ) || isSupport;

    if (!isStaff) {
      await interaction.editReply({
        content:
          "❌ You do not have permission to rename tickets.",
      });
      return;
    }

    if (ticket.status === "CLOSED") {
      await interaction.editReply({
        content:
          "❌ Closed tickets cannot be renamed.",
      });
      return;
    }

    const me = interaction.guild.members.me;

    if (
      !me?.permissions.has(
        PermissionFlagsBits.ManageChannels,
      )
    ) {
      await interaction.editReply({
        content:
          "❌ I need the **Manage Channels** permission.",
      });
      return;
    }

    const sanitizedName = interaction.options
      .getString("name", true)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9- ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (sanitizedName.length === 0) {
      await interaction.editReply({
        content: "❌ Invalid ticket name.",
      });
      return;
    }

    if (channel.name === sanitizedName) {
      await interaction.editReply({
        content:
          "❌ The ticket already has that name.",
      });
      return;
    }

    try {
      await channel.setName(
        sanitizedName,
        `Ticket renamed by ${interaction.user.tag}`,
      );

      await interaction.editReply({
        content: `✅ Renamed ticket to **${sanitizedName}**.`,
      });
    } catch (error) {
      console.error("[Ticket Rename]", error);

      await interaction.editReply({
        content:
          "❌ Failed to rename the ticket.",
      });
    }
  },
};

export default command;