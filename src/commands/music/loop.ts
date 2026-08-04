import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireActivePlayer, requireDjPermission } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-loop")
    .setDescription("Set the loop mode.")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Loop mode.")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "off" },
          { name: "Track", value: "track" },
          { name: "Queue", value: "queue" },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const activeCheck = requireActivePlayer(interaction);

    if (!activeCheck.success) {
      await interaction.reply({ content: activeCheck.message, ephemeral: true });
      return;
    }

    const djCheck = await requireDjPermission(interaction);

    if (!djCheck.success) {
      await interaction.reply({ content: djCheck.message, ephemeral: true });
      return;
    }

    const mode = interaction.options.getString("mode", true) as "off" | "track" | "queue";
    const player = lavalinkManager.getPlayer(interaction.guildId)!;

    player.setRepeatMode(mode);

    const labels = { off: "disabled", track: "current track", queue: "whole queue" };

    await interaction.reply({ content: `🔁 Loop set to: ${labels[mode]}.` });
  },
};

export default command;
