import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 15,
  permissions: [],
  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename the current ticket.")
    .addStringOption(o => o.setName("name").setRequired(true).setMaxLength(80)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({ content: "❌ Must be a text channel.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const ticket = await ticketService.getByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.editReply("❌ Not a registered ticket.");
      return;
    }

    const name = interaction.options.getString("name", true).toLowerCase().replace(/ /g, "-");
    try {
      await channel.setName(name);
      await interaction.editReply(`✅ Renamed to **${name}**.`);
    } catch {
      await interaction.editReply("❌ Failed to rename. Rate limit likely.");
    }
  },
};
export default command;