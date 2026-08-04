import {
  Events,
  Sticker,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.GuildStickerUpdate,

  async execute(
    oldSticker: Sticker,
    newSticker: Sticker,
  ): Promise<void> {
    if (!newSticker.guild) return;

    await serverLogService.logStickerUpdate(
      newSticker.guild,
      oldSticker,
      newSticker,
    );
  },
};
