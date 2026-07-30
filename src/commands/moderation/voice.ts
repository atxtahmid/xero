import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, VoiceBasedChannel } from "discord.js";
import { Permission, type Command } from "../../types/Command.js";
import { canModerate, fetchMember } from "../../utils/moderation.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription("Voice moderation.")
    .addSubcommand(s => s.setName("mute").addUserOption(o => o.setName("user").setRequired(true)))
    .addSubcommand(s => s.setName("disconnect").addUserOption(o => o.setName("user").setRequired(true))) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const targetUser = interaction.options.getUser("user", true);
    const member = await fetchMember(interaction, targetUser.id);

    if (!member || !member.voice.channel) {
      await interaction.reply({ content: "❌ User not in voice.", ephemeral: true });
      return;
    }

    const check = canModerate(interaction, member);
    if (!check.success) {
      await interaction.reply({ content: check.message!, ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "mute") await member.voice.setMute(true);
      else await member.voice.disconnect();

      await interaction.reply({ content: `✅ Voice ${sub} applied.` });
      await sendModLog({ guild: interaction.guild, moderator: interaction.user, target: targetUser, action: `Voice ${sub}`, reason: "N/A", caseId: "N/A" });
    } catch {
      await interaction.reply({ content: "❌ Action failed.", ephemeral: true });
    }
  },
};
export default command;