import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import lavalinkManager from "../../services/music/lavalinkManager.js";
import { requireActivePlayer, requireDjPermission } from "../../utils/musicChecks.js";
import { Permission, type Command } from "../../types/Command.js";

// Lavalink has no built-in "bassboost" filter — it's conventionally faked
// with an equalizer preset boosting the low bands.
const BASSBOOST_EQ = [
  { band: 0, gain: 0.6 },
  { band: 1, gain: 0.5 },
  { band: 2, gain: 0.4 },
  { band: 3, gain: 0.25 },
  { band: 4, gain: 0.15 },
];

const FILTER_CHOICES = [
  { name: "Bassboost", value: "bassboost" },
  { name: "Nightcore", value: "nightcore" },
  { name: "Vaporwave", value: "vaporwave" },
  { name: "8D (rotation)", value: "rotation" },
  { name: "Karaoke", value: "karaoke" },
  { name: "Tremolo", value: "tremolo" },
  { name: "Vibrato", value: "vibrato" },
  { name: "Low pass", value: "lowpass" },
  { name: "Reset all filters", value: "reset" },
] as const;

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName("music-filters")
    .setDescription("Toggle an audio filter on the current player.")
    .addStringOption((option) => {
      option
        .setName("type")
        .setDescription("Filter to toggle.")
        .setRequired(true);

      for (const choice of FILTER_CHOICES) {
        option.addChoices(choice);
      }

      return option;
    }),

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

    const type = interaction.options.getString("type", true);
    const player = lavalinkManager.getPlayer(interaction.guildId)!;
    const filters = player.filterManager;

    switch (type) {
      case "bassboost":
        await filters.setEQ(BASSBOOST_EQ);
        await interaction.reply({ content: "🎚️ Bassboost applied." });
        return;

      case "nightcore":
        await filters.toggleNightcore();
        await interaction.reply({ content: "🎚️ Nightcore toggled." });
        return;

      case "vaporwave":
        await filters.toggleVaporwave();
        await interaction.reply({ content: "🎚️ Vaporwave toggled." });
        return;

      case "rotation":
        await filters.toggleRotation();
        await interaction.reply({ content: "🎚️ 8D rotation toggled." });
        return;

      case "karaoke":
        await filters.toggleKaraoke();
        await interaction.reply({ content: "🎚️ Karaoke toggled." });
        return;

      case "tremolo":
        await filters.toggleTremolo();
        await interaction.reply({ content: "🎚️ Tremolo toggled." });
        return;

      case "vibrato":
        await filters.toggleVibrato();
        await interaction.reply({ content: "🎚️ Vibrato toggled." });
        return;

      case "lowpass":
        await filters.toggleLowPass();
        await interaction.reply({ content: "🎚️ Low pass toggled." });
        return;

      case "reset":
        await filters.resetFilters();
        await interaction.reply({ content: "🎚️ All filters reset." });
        return;

      default:
        await interaction.reply({ content: "❌ Unknown filter.", ephemeral: true });
    }
  },
};

export default command;
