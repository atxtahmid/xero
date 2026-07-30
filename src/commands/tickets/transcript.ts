import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 20,
  permissions: [],
  data: new SlashCommandBuilder().setName("transcript").setDescription("Generate ticket transcript."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({ content: "❌ Only for text channels.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const ticket = await ticketService.getByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.editReply("❌ Not a registered ticket.");
      return;
    }

    const messages = await channel.messages.fetch({ limit: 100 });
    let data = `TRANSCRIPT: ${channel.name}\n\n`;
    messages.reverse().forEach(m => {
      data += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
    });

    const attachment = new AttachmentBuilder(Buffer.from(data, "utf-8"), { name: "transcript.txt" });
    await interaction.editReply({ content: "✅ Generated.", files: [attachment] });
  },
};
export default command;