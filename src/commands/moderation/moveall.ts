import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { sendModLog } from "../../services/modLogService.js";

const command: Command = {
  permissions: [Permission.MODERATOR],
  guildOnly: true,
  cooldown: 20,

  data: new SlashCommandBuilder()
    .setName("moveall")
    .setDescription("Move everyone from one voice channel to another.")
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addChannelOption((option) =>
      option
        .setName("from")
        .setDescription("Source voice channel.")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("to")
        .setDescription("Destination voice channel.")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const from = interaction.options.getChannel("from", true) as VoiceBasedChannel;
    const to = interaction.options.getChannel("to", true) as VoiceBasedChannel;

    if (from.id === to.id) {
      await interaction.editReply({ content: "❌ Source and destination channels must be different." });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissionsIn(from).has(PermissionFlagsBits.MoveMembers) || !me?.permissionsIn(to).has(PermissionFlagsBits.MoveMembers)) {
      await interaction.editReply({ content: "❌ I need the **Move Members** permission in both channels." });
      return;
    }

    const members = [...from.members.values()];
    if (members.length === 0) {
      await interaction.editReply({ content: "❌ The source voice channel is empty." });
      return;
    }

    let moved = 0;
    let failed = 0;

    // Use Promise.allSettled to move everyone. 
    // While Discord rate-limits voice moves, batching them is safer than a sequential loop for interaction life.
    const movePromises = members.map(member => 
      member.voice.setChannel(to, `Mass move by ${interaction.user.tag}`)
        .then(() => { moved++; })
        .catch(() => { failed++; })
    );

    await Promise.allSettled(movePromises);

    await interaction.editReply({
      content: `✅ Finished: Moved **${moved}** member(s) to ${to}.${failed > 0 ? ` (${failed} failed)` : ""}`
    });

    await sendModLog({
      guild: interaction.guild,
      moderator: interaction.user,
      target: interaction.user,
      action: "Mass Move",
      reason: `Moved ${moved} members from #${from.name} to #${to.name}.`,
      caseId: "N/A",
    });
  },
};

export default command;