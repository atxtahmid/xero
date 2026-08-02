import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import db from "../../services/database.js";
import lockdownService from "../../services/lockdownService.js";
import { Permission, type Command } from "../../types/Command.js";
import { isHighlyTrusted } from "../../utils/auth.js";

// A manual escape hatch. Lockdown is designed to lift itself automatically
// once the cooldown passes with no further Anti-Nuke triggers — this
// command exists purely as a safety net in case that ever needs to be
// checked or forced (e.g. the scheduler misbehaves, or staff are certain
// the situation is resolved and don't want to wait out the cooldown).
const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("antinuke-lockdown")
    .setDescription("View or manage Server Lockdown status (Owner/Co-Owner Only).")
    .addSubcommand((s) =>
      s.setName("status").setDescription("Check if Server Lockdown is currently active."),
    )
    .addSubcommand((s) =>
      s
        .setName("lift")
        .setDescription("Manually lift Server Lockdown before the automatic cooldown ends."),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({
        content:
          "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "status") {
      const record = await db.antiNukeLockdown.findUnique({
        where: { guildId: interaction.guild.id },
      });

      if (!record || !record.active) {
        await interaction.reply({
          content: "🔓 Server Lockdown is **not active**.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x992d22)
        .setTitle("🔒 Server Lockdown Status")
        .addFields(
          { name: "Reason", value: record.reason },
          { name: "Engaged At", value: `<t:${Math.floor(record.triggeredAt.getTime() / 1000)}:F>` },
          { name: "Last Trigger", value: `<t:${Math.floor(record.lastTriggerAt.getTime() / 1000)}:R>` },
        )
        .setFooter({ text: "Auto-lifts 5 minutes after the last Anti-Nuke trigger." });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // sub === "lift"
    await interaction.deferReply({ ephemeral: true });

    const isActive = await lockdownService.isActive(interaction.guild.id);

    if (!isActive) {
      await interaction.editReply({
        content: "🔓 Server Lockdown is not currently active — nothing to lift.",
      });
      return;
    }

    try {
      await lockdownService.disengage(interaction.guild);

      await interaction.editReply({
        content: "🔓 Server Lockdown has been manually lifted. Role permissions restored.",
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Failed to lift lockdown: ${error.message ?? "Unknown error."}`,
      });
    }
  },
};

export default command;