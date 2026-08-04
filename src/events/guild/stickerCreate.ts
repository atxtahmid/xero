import {
  Events,
  Sticker,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildStickerCreate,

  async execute(
    sticker: Sticker,
  ): Promise<void> {
    if (!sticker.guild) return;

    await serverLogService.logStickerCreate(sticker.guild, sticker);
  },
};
