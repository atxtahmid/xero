import {
  Events,
  VoiceState,
} from "discord.js";

import serverLogService from "../../services/logging/serverLogService.js";
import lavalinkManager from "../../services/music/lavalinkManager.js";

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

    await handleMusicAutoPause(oldState, newState);
  },
};

// Auto-pauses (and, if left empty long enough, the configured
// onEmptyQueue/disconnect handling in lavalinkManager takes it from
// there) whenever every non-bot member leaves the voice channel the
// player is connected to -- and auto-resumes if someone rejoins. This
// only inspects the channel that changed, so it's cheap on busy servers.
async function handleMusicAutoPause(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const guildId = newState.guild.id;
  const player = lavalinkManager.getPlayer(guildId);

  if (!player?.voiceChannelId) return;

  const relevantChannelId =
    oldState.channelId === player.voiceChannelId
      ? oldState.channelId
      : newState.channelId === player.voiceChannelId
        ? newState.channelId
        : null;

  if (!relevantChannelId) return;

  const channel = newState.guild.channels.cache.get(relevantChannelId);

  if (!channel || !channel.isVoiceBased()) return;

  const humansPresent = channel.members.some((member) => !member.user.bot);

  try {
    if (!humansPresent && !player.paused) {
      await player.pause();
    } else if (humansPresent && player.paused) {
      await player.resume();
    }
  } catch {
    // Best-effort -- a failed auto pause/resume isn't worth surfacing.
  }
}
