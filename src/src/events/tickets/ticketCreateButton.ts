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
import ticketService from "../../services/ticketService.js";

export default async function ticketCreateButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  await interaction.deferReply({
    ephemeral: true,
  });

  const me =
    interaction.guild.members.me;

  if (
    !me?.permissions.has(
      PermissionFlagsBits.ManageChannels,
    )
  ) {
    await interaction.editReply({
      content:
        "❌ I need the **Manage Channels** permission to create tickets.",
    });

    return;
  }

  const panel =
    await db.ticketPanel.findFirst({
      where: {
        guildId: interaction.guild.id,
        channelId: interaction.channelId,
        messageId: interaction.message.id,
      },
    });

  if (!panel) {
    await interaction.editReply({
      content:
        "❌ Ticket panel configuration not found.",
    });

    return;
  }

  const alreadyExists =
    await ticketService.exists(
      interaction.guild.id,
      panel.id,
      interaction.user.id,
    );

  if (alreadyExists) {
    await interaction.editReply({
      content:
        "❌ You already have an open ticket in this department.",
    });

    return;
  }

  const everyone =
    interaction.guild.roles.everyone;

  // Sanitize username for channel name
  const safeUsername =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || interaction.user.id.slice(-5);

  // Validate category existence if configured
  let parentId: string | undefined = undefined;
  if (panel.categoryId) {
    const category = interaction.guild.channels.cache.get(panel.categoryId);
    if (category && category.type === ChannelType.GuildCategory) {
      parentId = panel.categoryId;
    }
  }

  let channel;

  try {
    channel =
      await interaction.guild.channels.create({
        name: `ticket-${safeUsername}`,

        type: ChannelType.GuildText,

        parent: parentId,

        permissionOverwrites: [
          {
            id: everyone.id,
            deny: [
              PermissionFlagsBits.ViewChannel,
            ],
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
          ...(panel.supportRoleId && interaction.guild.roles.cache.has(panel.supportRoleId)
            ? [
                {
                  id: panel.supportRoleId,
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                  ],
                },
              ]
            : []),
        ],
      });
  } catch (error) {
    console.error(
      "Failed to create ticket channel:",
      error,
    );

    await interaction.editReply({
      content:
        "❌ Failed to create the ticket channel. Please contact an administrator.",
    });

    return;
  }

  try {
    await ticketService.create(
      interaction.guild.id,
      panel.id,
      channel.id,
      interaction.user.id,
    );
  } catch (error) {
    console.error("Database error during ticket creation:", error);
    await channel.delete(
      "Failed to create ticket database record.",
    ).catch(() => {});

    await interaction.editReply({
      content: "❌ Internal error while registering ticket. Please try again.",
    });
    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(panel.color)
      .setTitle(
        `🎫 Ticket: ${panel.name}`,
      )
      .setDescription(
        [
          `Welcome ${interaction.user}.`,
          "",
          "Please describe your issue in detail.",
          "Our staff will assist you as soon as possible.",
        ].join("\n"),
      )
      .setTimestamp();

  const controls =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "ticket:claim",
          )
          .setLabel("Claim")
          .setEmoji("🙋")
          .setStyle(
            ButtonStyle.Success,
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket:lock",
          )
          .setLabel("Lock")
          .setEmoji("🔒")
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket:unlock",
          )
          .setLabel("Unlock")
          .setEmoji("🔓")
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket:close",
          )
          .setLabel("Close")
          .setEmoji("🔴")
          .setStyle(
            ButtonStyle.Danger,
          ),
      );

  const danger =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "ticket:delete",
          )
          .setLabel("Delete")
          .setEmoji("🗑️")
          .setStyle(
            ButtonStyle.Danger,
          ),
      );

  try {
    await channel.send({
      content:
        panel.supportRoleId
          ? `<@&${panel.supportRoleId}>`
          : undefined,
      embeds: [embed],
      components: [
        controls,
        danger,
      ],
    });
  } catch (error) {
    console.error(
      "Failed to send ticket message:",
      error,
    );

    // Rollback
    await ticketService.delete(channel.id).catch(() => {});
    await channel.delete("Failed to send initial ticket message.").catch(() => {});

    await interaction.editReply({
      content:
        "❌ Failed to initialize the ticket message. Please try again later.",
    });

    return;
  }

  await interaction.editReply({
    content: `✅ Your ticket has been created: ${channel}`,
  });
}