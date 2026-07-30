import {
  ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";

import ticketService from "../../services/ticketService.js";

export default async function ticketUnclaimButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const ticket = await ticketService.getByChannel(interaction.channelId);

  if (!ticket) {
    await interaction.editReply({
      content: "❌ This channel is not a registered ticket.",
    });
    return;
  }

  if (!ticket.claimedById) {
    await interaction.editReply({
      content: "❌ This ticket is not currently claimed.",
    });
    return;
  }

  // Permission: Must be the person who claimed it, OR have Administrator/ManageChannels to override.
  const isClaimer = ticket.claimedById === interaction.user.id;
  const isManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

  if (!isClaimer && !isManager) {
    await interaction.editReply({
      content: "❌ Only the person who claimed this ticket (or a Manager) can unclaim it.",
    });
    return;
  }

  await ticketService.unclaim(interaction.channelId);

  const channel = interaction.channel;
  if (channel?.isTextBased() && "setName" in channel) {
    try {
      if (channel.name.startsWith("claimed-")) {
        const newName = channel.name.replace(/^claimed-/, "");
        await (channel as any).setName(newName);
      }
    } catch {
      // Ignore rename rate limits
    }
  }

  await interaction.editReply({
    content: "✅ You have unclaimed this ticket. It is now open for other staff.",
  });

  await channel?.send({
    content: `↩️ ${interaction.user} has unclaimed this ticket.`,
  });
}