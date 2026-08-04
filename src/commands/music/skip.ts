import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireActivePlayer, requireDjPermission } from "../../utils/musicChecks.js";
import { trackLine } from "../../services/music/musicService.js";
import { Permission, type Command } from "../../types/Command.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName("music-skip")
    .setDescription("Skip the current track."),

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
    const skipped = player.queue.current;

    await player.skip();

    await interaction.reply({
      content: skipped ? `⏭️ Skipped ${trackLine(skipped)}` : "⏭️ Skipped.",
    });
  },
};

export default command;
