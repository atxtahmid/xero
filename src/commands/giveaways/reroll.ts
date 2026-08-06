import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import giveawayService from "../../services/giveaways/giveawayService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("giveaway-reroll")
    .setDescription("Pick new winner(s) for an already-ended giveaway.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("message-id")
        .setDescription("The giveaway message's ID.")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString("message-id", true);

    const giveaway = await giveawayService.findByMessageId(messageId);

    if (!giveaway || giveaway.guildId !== interaction.guild.id) {
      await interaction.editReply({
        content: "❌ No giveaway found with that message ID in this server.",
      });
      return;
    }

    try {
      const newWinnerIds = await giveawayService.reroll(
        interaction.client,
        giveaway.id,
      );

      if (newWinnerIds.length === 0) {
        await interaction.editReply({
          content: "❌ No other eligible entrants to reroll from.",
        });
        return;
      }

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);

      if (channel instanceof TextChannel) {
        await channel.send({
          content: `🎉 New winner(s) for **${giveaway.prize}**: ${newWinnerIds.map((id) => `<@${id}>`).join(", ")}!`,
        });
      }

      await interaction.editReply({
        content: `✅ Rerolled. New winner(s): ${newWinnerIds.map((id) => `<@${id}>`).join(", ")}`,
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ ${error.message ?? "Failed to reroll."}`,
      });
    }
  },
};

export default command;
