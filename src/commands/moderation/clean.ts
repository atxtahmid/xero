import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/moderation/modLogService.js";
import logger from "../../logger/logger.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("clean")
    .setDescription("Clean messages using specific filters.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Messages to clean.")
        .setRequired(true)
        .addChoices(
          { name: "Bots", value: "bots" },
          { name: "Humans", value: "humans" },
          { name: "Links", value: "links" },
          { name: "Attachments", value: "attachments" },
          { name: "User", value: "user" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Messages to scan (1-100).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("Specific user to clean (required if type is User).")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel?.isTextBased()) return;

    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString("type", true);
    const limit = interaction.options.getInteger("limit", true);
    const target = interaction.options.getUser("target");

    if (type === "user" && !target) {
      await interaction.editReply("❌ You must specify a target user when using the 'User' filter.");
      return;
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit });

      const filtered = messages.filter((msg: Message) => {
        switch (type) {
          case "bots": return msg.author.bot;
          case "humans": return !msg.author.bot;
          case "links": return /https?:\/\//i.test(msg.content);
          case "attachments": return msg.attachments.size > 0;
          case "user": return msg.author.id === target?.id;
          default: return false;
        }
      });

      if (filtered.size === 0) {
        await interaction.editReply(`🔎 No messages found matching the filter: **${type}** within the last ${limit} messages.`);
        return;
      }

      // bulkDelete(Collection, filterOld: true)
      const deleted = await (interaction.channel as any).bulkDelete(filtered, true);

      await interaction.editReply(`🧹 Cleaned **${deleted.size}** message(s) matching: **${type}**.`);

      // Log the event
      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: target ?? interaction.user,
        action: "Clean",
        reason: `Cleaned ${deleted.size} messages (Type: ${type}) in <#${interaction.channel.id}>.`,
        caseId: "N/A",
      });
    } catch (error) {
      logger.error("[Clean Command] Error:", error);
      await interaction.editReply("❌ An error occurred while trying to clean messages. Ensure I have Manage Messages permission.");
    }
  },
};

export default command;