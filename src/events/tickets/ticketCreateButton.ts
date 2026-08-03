import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
} from "discord.js";

import db from "../../services/database.js";
import logger from "../../services/logger.js";
import notificationService from "../../services/notificationService.js";
import ticketLogService from "../../services/ticketLogService.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketCreateButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  const me = interaction.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply({
      content: "❌ I need the **Manage Channels** permission to create tickets.",
    });
    return;
  }

  const panel = await db.ticketPanel.findFirst({
    where: {
      guildId: interaction.guild.id,
      channelId: interaction.channelId,
      messageId: interaction.message.id,
    },
  });

  if (!panel) {
    await interaction.editReply({ content: "❌ Ticket panel configuration not found." });
    return;
  }

  const alreadyExists = await ticketService.exists(interaction.guild.id, panel.id, interaction.user.id);
  if (alreadyExists) {
    await interaction.editReply({ content: "❌ You already have an open ticket in this department." });
    return;
  }

  const safeUsername = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || interaction.user.id.slice(-5);

  let parentId: string | undefined = undefined;
  if (panel.categoryId) {
    const category = interaction.guild.channels.cache.get(panel.categoryId);
    if (category && category.type === ChannelType.GuildCategory) {
      parentId = panel.categoryId;
    }
  }

  let channel;
  try {
    channel = await interaction.guild.channels.create({
      name: `ticket-${safeUsername}`,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        ...(panel.supportRoleId ? [
          {
            id: panel.supportRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ] : []),
      ],
    });
  } catch (error) {
    await interaction.editReply({ content: "❌ Failed to create the ticket channel." });
    return;
  }

  try {
    await ticketService.create(interaction.guild.id, panel.id, channel.id, interaction.user.id);
  } catch (error) {
    await channel.delete().catch(() => {});
    await interaction.editReply({ content: "❌ Database error. Please try again." });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(panel.color)
    .setTitle(`🎫 Ticket: ${panel.name}`)
    .setDescription(`Welcome ${interaction.user}.\nPlease describe your issue.`)
    .setTimestamp();

  const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel("Claim").setEmoji("🙋").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ticket:lock").setLabel("Lock").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:unlock").setLabel("Unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Close").setEmoji("🔴").setStyle(ButtonStyle.Danger)
  );

  const danger = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:delete").setLabel("Delete").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: panel.supportRoleId ? `<@&${panel.supportRoleId}>` : undefined,
    embeds: [embed],
    components: [controls, danger],
  });

  await interaction.editReply({ content: `✅ Ticket created: ${channel}` });

  // ticketLogService had 7 log methods built but only logDelete (and only
  // its slash-command path) was ever actually called anywhere — every
  // other ticket lifecycle event, including creation, was silently
  // unlogged despite panel admins being able to configure a log channel
  // expecting exactly this.
  ticketLogService
    .logCreate(interaction.guild, channel.id, interaction.user)
    .catch((error) => {
      logger.error("[Ticket Create] Failed to write ticket log:", error);
    });

  // Layer 1 — if the support role is missing or has no human members,
  // this pings up to 5 qualifying admin roles in the ticket channel
  // (falling back to a server-owner DM) so the ticket doesn't sit
  // unattended. Fire-and-forget: this should never block or fail ticket
  // creation itself.
  notificationService
    .checkAndNotifyTicketSupportRole(channel, panel.supportRoleId)
    .catch((error) => {
      logger.error("[Ticket Create] Support role notification failed:", error);
    });
}