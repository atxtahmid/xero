import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import antiNukeWhitelistService from "../../services/antiNukeWhitelistService.js";
import { Permission, type Command } from "../../types/Command.js";

const ITEMS_PER_PAGE = 10;

const command: Command = {
  permissions: [Permission.ANTINUKE],
  guildOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("whitelist-list")
    .setDescription("View the Anti-Nuke whitelist with pagination."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const totalEntries = await antiNukeWhitelistService.count(guildId);

    if (totalEntries === 0) {
      await interaction.editReply({
        content: "📄 The Anti-Nuke whitelist is empty.\n💡 Use `/whitelist-add` to add users.",
      });
      return;
    }

    let currentPage = 0;
    const totalPages = Math.ceil(totalEntries / ITEMS_PER_PAGE);

    const generateEmbed = async (page: number) => {
      const skip = page * ITEMS_PER_PAGE;
      const entries = await antiNukeWhitelistService.list(guildId, skip, ITEMS_PER_PAGE);

      const embed = new EmbedBuilder()
        .setTitle("🛡️ Anti-Nuke Whitelist")
        .setColor(0x57f287)
        .setFooter({ text: `Page ${page + 1} of ${totalPages} • Total Entries: ${totalEntries}` })
        .setTimestamp();

      const description = entries
        .map((e) => `• <@${e.userId}> → \`${e.category}\``)
        .join("\n");

      embed.setDescription(description || "No entries on this page.");
      return embed;
    };

    const generateButtons = (page: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const message = await interaction.editReply({
      embeds: [await generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000, // 1 minute timeout
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: "❌ You cannot use these buttons.", ephemeral: true });
        return;
      }

      if (i.customId === "prev") currentPage--;
      if (i.customId === "next") currentPage++;

      await i.update({
        embeds: [await generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
      });
    });

    collector.on("end", () => {
      // Disable buttons after timeout
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

export default command;