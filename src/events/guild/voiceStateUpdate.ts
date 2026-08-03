import {
  Events,
  VoiceState,
} from "discord.js";

import serverLogService from "../../services/serverLogService.js";

export default {
  name: Events.VoiceStateUpdate,

  async execute(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    await serverLogService.logVoiceStateUpdate(
      newState.guild,
      oldState,
      newState,
    );
  },
};
