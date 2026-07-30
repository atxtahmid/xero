import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Collection,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const MAX_MESSAGES = 1000; // Safety cap to prevent Railway OOM crashes

const command: Command = {
  guildOnly: true,
  cooldown: 20,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("transcript")
    .setDescription("Generate a transcript of the current ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) return;

    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply({ content: "❌ This channel is not a registered ticket." });
      return;
    }

    // Permission Check: ManageChannels OR Support Role
    const isStaff = 
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      (ticket.panel.supportRoleId && (interaction.member?.roles as any).cache.has(ticket.panel.supportRoleId));

    if (!isStaff) {
      await interaction.editReply({ content: "❌ You do not have permission to generate transcripts." });
      return;
    }

    const messages = new Collection<string, Message>();
    let lastId: string | undefined;
    let totalFetched = 0;

    // Batch fetch messages with safety cap
    while (totalFetched < MAX_MESSAGES) {
      const batch: Collection<string, Message> = await interaction.channel.messages.fetch({ 
        limit: 100, 
        before: lastId 
      });
      
      if (batch.size === 0) break;

      batch.forEach(msg => messages.set(msg.id, msg));
      lastId = batch.last()?.id;
      totalFetched += batch.size;

      if (batch.size < 100) break;
    }

    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Build Transcript Header
    let transcriptData = `TICKET TRANSCRIPT\n`;
    transcriptData += `========================================\n`;
    transcriptData += `ID: ${ticket.id}\n`;
    transcriptData += `Channel: #${interaction.channel.name} (${interaction.channelId})\n`;
    transcriptData += `Creator ID: ${ticket.creatorId}\n`;
    transcriptData += `Panel: ${ticket.panel.name}\n`;
    transcriptData += `Generated At: ${new Date().toISOString()}\n`;
    transcriptData += `Messages Logged: ${sortedMessages.size}\n`;
    transcriptData += `========================================\n\n`;

    // Process Messages
    sortedMessages.forEach(msg => {
      const timestamp = msg.createdAt.toISOString();
      const author = msg.author.tag;
      const content = msg.content || (msg.attachments.size > 0 ? "[Attachment]" : "[No Content]");
      
      transcriptData += `[${timestamp}] ${author}: ${content}\n`;
      
      if (msg.attachments.size > 0) {
        msg.attachments.forEach(att => {
          transcriptData += `  -> Attachment: ${att.url}\n`;
        });
      }
      
      if (msg.embeds.length > 0) {
        transcriptData += `  -> [Contains ${msg.embeds.length} embed(s)]\n`;
      }
    });

    transcriptData += `\n========================================\n`;
    transcriptData += `END OF TRANSCRIPT\n`;

    const buffer = Buffer.from(transcriptData, "utf-8");
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channelId}.txt` });

    await interaction.editReply({
      content: `✅ Transcript generated successfully (${sortedMessages.size} messages).`,
      files: [attachment],
    });
  },
};

export default command;