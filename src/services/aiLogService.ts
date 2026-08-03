import {
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
  User,
} from "discord.js";

import db from "./database.js";
import logger from "./logger.js";

const PREVIEW_LIMIT = 500;

function truncate(content: string): string {
  if (content.length <= PREVIEW_LIMIT) {
    return content;
  }

  return `${content.slice(0, PREVIEW_LIMIT)}… (truncated)`;
}

class AiLogService {
  private async resolveLogChannel(
    guild: Guild,
  ): Promise<TextChannel | null> {
    const settings = await db.guildSettings.findUnique({
      where: {
        guildId: guild.id,
      },
      select: {
        aiLogChannelId: true,
      },
    });

    if (!settings?.aiLogChannelId) {
      return null;
    }

    const channel = await guild.channels
      .fetch(settings.aiLogChannelId)
      .catch(() => null);

    if (!(channel instanceof TextChannel)) {
      return null;
    }

    const me = guild.members.me;

    if (
      !me ||
      !channel.permissionsFor(me)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ])
    ) {
      return null;
    }

    return channel;
  }

  async logChatInteraction(
    guild: Guild,
    channelId: string,
    user: User,
    prompt: string,
    response: string,
    searchEnabled: boolean,
  ): Promise<void> {
    try {
      const logChannel = await this.resolveLogChannel(guild);

      if (!logChannel) {
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🤖 AI Chat Used")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "👤 User",
            value: `${user.tag}\n(\`${user.id}\`)`,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: `<#${channelId}>`,
            inline: true,
          },
          {
            name: "🔎 Web Search",
            value: searchEnabled ? "Enabled" : "Disabled",
            inline: true,
          },
          {
            name: "💬 Prompt",
            value: truncate(prompt),
          },
          {
            name: "💡 Response",
            value: truncate(response),
          },
        )
        .setTimestamp();

      await logChannel.send({
        embeds: [embed],
      });
    } catch (error) {
      logger.error(
        `[AiLog] Failed to log chat interaction for guild ${guild.id}:`,
        error,
      );
    }
  }
}

export default new AiLogService();
