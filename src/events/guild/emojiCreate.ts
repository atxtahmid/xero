import {
  Events,
  GuildEmoji,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildEmojiCreate,

  async execute(
    emoji: GuildEmoji,
  ): Promise<void> {
    await serverLogService.logEmojiCreate(emoji.guild, emoji);
  },
};
