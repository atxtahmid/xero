import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import ticketService from "../../services/ticketService.js";

export default async function ticketCloseButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const channel = interaction.channel;
  if (!(channel instanceof TextChannel)) return;

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.editReply({ content: "❌ Not a registered ticket." });
    return;
  }

  const member =
    interaction.member instanceof GuildMember ? interaction.member : null;

  const isStaff =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (member &&
      ticket.panel.supportRoleId &&
      member.roles.cache.has(ticket.panel.supportRoleId));

  if (!isStaff) {
    await interaction.editReply({ content: "❌ Permission denied." });
    return;
  }

  await channel.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    { SendMessages: false },
  );

  await channel.permissionOverwrites.edit(ticket.creatorId, {
    SendMessages: false,
  });

  await ticketService.close(interaction.channelId);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:reopen")
      .setLabel("Reopen")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket:delete")
      .setLabel("Delete")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
  );

  if (interaction.message.editable) {
    await interaction.message.edit({ components: [row] });
  }

  await interaction.editReply({ content: "✅ Ticket closed." });

  await channel.send({
    content: `🔴 Closed by ${interaction.user}.`,
  });
}