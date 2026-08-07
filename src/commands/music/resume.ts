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
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName("music-resume")
    .setDescription("Resume the current track."),

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

    const player = lavalinkManager.getPlayer(interaction.guildId)!;

    if (!player.paused) {
      await interaction.reply({ content: "⚠️ Not paused.", ephemeral: true });
      return;
    }

    await player.resume();
    await interaction.reply({ content: "▶️ Resumed." });
  },
};

export default command;
