import {
  Events,
  GuildEmoji,
} from "discord.js";

import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.GuildEmojiDelete,

  async execute(
    emoji: GuildEmoji,
  ): Promise<void> {
    await serverLogService.logEmojiDelete(emoji.guild, emoji);
  },
};
