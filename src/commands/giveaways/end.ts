import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import giveawayService from "../../services/giveaways/giveawayService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("giveaway-end")
    .setDescription("End a giveaway early and draw winners now.")
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

    if (giveaway.ended) {
      await interaction.editReply({
        content: "❌ That giveaway has already ended. Use `/giveaway-reroll` if you want a new winner.",
      });
      return;
    }

    await giveawayService.end(interaction.client, giveaway.id);

    await interaction.editReply({
      content: `✅ Giveaway for **${giveaway.prize}** ended and winner(s) drawn.`,
    });
  },
};

export default command;
