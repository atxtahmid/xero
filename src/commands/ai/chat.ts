import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Permission, type Command } from "../../types/Command.js";
import aiService from "../../services/aiService.js";
import guildSettingsService from "../../services/guildSettingsService.js";

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: true,
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with Xero AI.")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("Your message")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const settings = await guildSettingsService.get(interaction.guild.id);

    if (!settings.aiEnabled) {
      await interaction.reply({
        content: "❌ AI chat is disabled on this server. An admin can re-enable it with `/settings-ai enabled:true`.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const prompt = interaction.options.getString("prompt", true);
    const response = await aiService.chat(interaction.user.id, interaction.guild.id, prompt, settings.searchEnabled);

    await interaction.editReply(response);
  },
};

export default command;