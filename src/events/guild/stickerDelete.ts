import {
  Events,
  Sticker,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildStickerDelete,

  async execute(
    sticker: Sticker,
  ): Promise<void> {
    if (!sticker.guild) return;

    await serverLogService.logStickerDelete(sticker.guild, sticker);
  },
};
