import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import type { Command } from "../../types/Command.js";
import ticketService from "../../services/ticketService.js";

const command: Command = {
  guildOnly: true,
  cooldown: 20,
  permissions: [],

  data: new SlashCommandBuilder()
    .setName("transcript")
    .setDescription("Generate a transcript of the current ticket."),

  async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!interaction.guild) return;

    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({
        content:
          "❌ This command can only be used in ticket text channels.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const ticket = await ticketService.getByChannel(
      interaction.channelId,
    );

    if (!ticket) {
      await interaction.editReply({
        content: "❌ This is not a registered ticket.",
      });
      return;
    }

    const member = await interaction.guild.members.fetch(
      interaction.user.id,
    );

    const isSupport =
      !!ticket.panel.supportRoleId &&
      member.roles.cache.has(
        ticket.panel.supportRoleId,
      );

    const isStaff =
      member.permissions.has(
        PermissionFlagsBits.ManageChannels,
      ) || isSupport;

    if (!isStaff) {
      await interaction.editReply({
        content:
          "❌ You do not have permission to generate transcripts.",
      });
      return;
    }

    try {
      const messages = await channel.messages.fetch({
        limit: 100,
      });

      let transcript = "Ticket Transcript\n";
      transcript += `Channel: #${channel.name}\n`;
      transcript += `Channel ID: ${channel.id}\n`;
      transcript += `Generated: ${new Date().toLocaleString()}\n\n`;

      for (const message of [...messages.values()].reverse()) {
        transcript += `[${message.createdAt.toLocaleString()}] ${message.author.tag}: ${message.content}\n`;

        if (message.attachments.size > 0) {
          for (const attachment of message.attachments.values()) {
            transcript += `  Attachment: ${attachment.url}\n`;
          }
        }
      }

      const attachment = new AttachmentBuilder(
        Buffer.from(transcript, "utf8"),
        {
          name: `transcript-${channel.name}.txt`,
        },
      );

      await interaction.editReply({
        content: "✅ Transcript generated.",
        files: [attachment],
      });
    } catch (error) {
      console.error("[Ticket Transcript]", error);

      await interaction.editReply({
        content: "❌ Failed to generate transcript.",
      });
    }
  },
};

export default command;