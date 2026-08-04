import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireDjPermission } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName("music-stop")
    .setDescription("Stop playback and clear the queue (stays connected — use /music-leave to disconnect)."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) return;

    const player = lavalinkManager.getPlayer(interaction.guildId);

    if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
      await interaction.reply({ content: "❌ Nothing is playing here.", ephemeral: true });
      return;
    }

    const djCheck = await requireDjPermission(interaction);

    if (!djCheck.success) {
      await interaction.reply({ content: djCheck.message, ephemeral: true });
      return;
    }

    await player.queue.splice(0, player.queue.tracks.length);

    if (player.playing || player.paused) {
      await player.skip(undefined, false);
    }

    await interaction.reply({ content: "⏹️ Stopped and cleared the queue. Still in the voice channel." });
  },
};

export default command;
