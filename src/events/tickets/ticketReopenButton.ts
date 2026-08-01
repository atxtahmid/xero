import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketReopenButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);

  if (!ticket) {
    await interaction.editReply({ content: "❌ Ticket not found." });
    return;
  }

  if (ticket.status !== "CLOSED") {
    await interaction.editReply({ content: "❌ Ticket is not closed." });
    return;
  }

  const isStaff =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (ticket.panel.supportRoleId &&
      (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({ content: "❌ Permission denied." });
    return;
  }

  try {
    await ticketService.reopen(interaction.channelId);

    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: null },
    );

    await interaction.channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: true,
      ViewChannel: true,
    });

    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket:claim")
        .setLabel("Claim")
        .setEmoji("🙋")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("ticket:lock")
        .setLabel("Lock")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("ticket:unlock")
        .setLabel("Unlock")
        .setEmoji("🔓")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("ticket:close")
        .setLabel("Close")
        .setEmoji("🔴")
        .setStyle(ButtonStyle.Danger),
    );

    const danger = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket:delete")
        .setLabel("Delete")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.message.edit({ components: [controls, danger] });

    await interaction.editReply({ content: "✅ Ticket reopened." });

    await interaction.channel.send({
      content: `🔓 Reopened by ${interaction.user}.`,
    });
  } catch (e: any) {
    await interaction.editReply({
      content: `❌ ${e.message ?? "Failed to reopen ticket."}`,
    });
  }
}