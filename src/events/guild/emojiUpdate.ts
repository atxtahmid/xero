import {
  Events,
  GuildEmoji,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildEmojiUpdate,

  async execute(
    oldEmoji: GuildEmoji,
    newEmoji: GuildEmoji,
  ): Promise<void> {
    await serverLogService.logEmojiUpdate(
      newEmoji.guild,
      oldEmoji,
      newEmoji,
    );
  },
};
