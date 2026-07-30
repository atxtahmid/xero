import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 15,

  data: new SlashCommandBuilder()
    .setName("clone")
    .setDescription("Clone the current text channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "❌ This command can only be used in a text channel.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const oldChannel = interaction.channel as TextChannel;

    try {
      const clone = await oldChannel.clone({
        name: `${oldChannel.name}-copy`,
        reason: `Channel cloned by ${interaction.user.tag}`,
      });

      await clone.setParent(oldChannel.parentId, { lockPermissions: false });
      await clone.setPosition(oldChannel.position + 1);

      await interaction.editReply({ content: `✅ Successfully created a clone: ${clone}` });

      await sendModLog({
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.user,
        action: "Channel Clone",
        reason: `Cloned #${oldChannel.name} to #${clone.name}.`,
        caseId: "N/A",
      });
    } catch (error) {
      console.error("[Clone Command] Error:", error);
      await interaction.editReply({ content: "❌ Failed to clone the channel." });
    }
  },
};

export default command;