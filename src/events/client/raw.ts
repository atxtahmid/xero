import { Events } from "discord.js";

import { forwardRawPacket } from "../../services/music/lavalinkManager.js";
import type { Event } from "../../types/Event.js";

// Lavalink needs raw VOICE_STATE_UPDATE / VOICE_SERVER_UPDATE gateway
// payloads to track voice connections -- discord.js consumes these itself
// but still re-emits the untouched packet here for exactly this purpose.
//
// Events.Raw isn't in discord.js's ClientEvents type map, so it can't
// satisfy Event<K extends keyof ClientEvents>. Typed as any here since
// the raw payload shape is whatever Discord's gateway sends, not
// something discord.js models.
const event: Event<any> = {
  name: Events.Raw,

  execute(packet: any): void {
    forwardRawPacket(packet);
  },
};

export default event;
