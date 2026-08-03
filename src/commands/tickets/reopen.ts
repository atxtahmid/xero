import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";
import ticketLogService from "../../services/ticketLogService.js";
import logger from "../../services/logger.js";

const command: Command = {
  guildOnly: true,
  cooldown: 5,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("reopen")
    .setDescription("Reopen a closed ticket."),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.guild) return;

    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({
        content: "❌ Invalid channel type.",
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
          "❌ You do not have permission to reopen tickets.",
      });
      return;
    }

    if (ticket.status !== "CLOSED") {
      await interaction.editReply({
        content: "❌ This ticket is not closed.",
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

    try {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          SendMessages: null,
        },
      );

      await channel.permissionOverwrites.edit(
        ticket.creatorId,
        {
          SendMessages: true,
          ViewChannel: true,
        },
      );

      await ticketService.reopen(
        interaction.channelId,
      );

      await interaction.editReply({
        content: "✅ Ticket reopened.",
      });

      await channel.send({
        content: `🔓 Ticket reopened by ${interaction.user}.`,
      });

      const creator = await interaction.client.users
        .fetch(ticket.creatorId)
        .catch(() => null);

      if (creator) {
        ticketLogService
          .logReopen(interaction.guild, interaction.channelId, creator, interaction.user)
          .catch((error) => {
            logger.error("[Ticket Reopen] Failed to write ticket log:", error);
          });
      }
    } catch (error) {
      logger.error("[Ticket Reopen]", error);

      await interaction.editReply({
        content:
          "❌ Failed to reopen the ticket.",
      });
    }
  },
};

export default command;