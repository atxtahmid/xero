import { LavalinkManager } from "lavalink-client";
import type { Client, TextChannel } from "discord.js";

import config from "../../config/index.js";
import logger from "../../logger/logger.js";
import musicAccessManager from "../../managers/musicAccessManager.js";

// sendToShard isn't a mutable property on a constructed LavalinkManager in
// this version of lavalink-client — it can only be provided at
// construction time. Since we don't have the discord.js Client yet at
// module load, we close over this module-level variable instead and fill
// it in from attachClient() once the client exists. Before that, the
// closure just no-ops (nothing should be sending packets yet anyway).
let discordClient: Client | undefined;

/**
 * Singleton Lavalink connection manager.
 *
 * Created once at module load (so command files can import it before the
 * client logs in), but only actually connects to the node once `init()`
 * is called from the ClientReady event, where we finally know the bot's
 * user id.
 */
export const lavalinkManager = new LavalinkManager({
  nodes: [
    {
      id: "main",
      host: config.lavalink.host,
      port: config.lavalink.port,
      authorization: config.lavalink.password,
      secure: config.lavalink.secure,
      retryAmount: 10,
      retryDelay: 5000,
    },
  ],

  // lavalink-client needs a way to actually deliver voice-gateway payloads
  // (join/leave/mute) back to Discord — it doesn't hold a discord.js Client
  // itself, so this reads from `discordClient`, which attachClient() below
  // fills in once the bot has logged in.
  sendToShard: (guildId: string, payload: unknown) => {
    discordClient?.guilds.cache.get(guildId)?.shard?.send(payload);
  },

  client: {
    id: config.discord.clientId,
    username: "Xero",
  },

  playerOptions: {
    defaultSearchPlatform: "ytsearch",
    volumeDecrementer: 1,
    onDisconnect: {
      autoReconnect: true,
      destroyPlayer: false,
    },
    onEmptyQueue: {
      // Deliberately no destroyAfterMs — per product requirement, the bot
      // stays connected when playback ends or the channel empties out; it
      // only leaves via the explicit /music-leave command or /music-stop.
    },
  },

  queueOptions: {
    maxPreviousTracks: 25,
  },
});

let attached = false;

/**
 * Wires the manager up to a live discord.js Client. Must run once, before
 * `init()`, and before any raw gateway packets are forwarded.
 */
export function attachClient(client: Client): void {
  if (attached) return;
  attached = true;

  // discord.js manages sharding for us here (no manual shard mgmt), so the
  // sendToShard closure above (reading discordClient) is the correct send
  // path even on a single-process multi-shard bot.
  discordClient = client;

  lavalinkManager.nodeManager.on("connect", (node) => {
    logger.info(`[Lavalink] Node "${node.id}" connected.`);
  });

  lavalinkManager.nodeManager.on("disconnect", (node, reason) => {
    logger.warn(`[Lavalink] Node "${node.id}" disconnected.`, reason);
  });

  lavalinkManager.nodeManager.on("error", (node, error) => {
    logger.error(`[Lavalink] Node "${node.id}" errored.`, error);
  });

  lavalinkManager.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId ?? "");

    if (channel?.isTextBased() && "send" in channel) {
      void (channel as TextChannel)
        .send({
          content: `🎶 Now playing **${track?.info.title ?? "Unknown track"}** by \`${track?.info.author ?? "Unknown"}\``,
        })
        .catch(() => {});
    }
  });

  lavalinkManager.on("queueEnd", (player) => {
    const channel = client.channels.cache.get(player.textChannelId ?? "");

    if (channel?.isTextBased() && "send" in channel) {
      void (channel as TextChannel)
        .send({
          content: "📭 Queue finished. Still connected — queue up more with `/music-play`, or `/music-leave` to disconnect.",
        })
        .catch(() => {});
    }
  });

  lavalinkManager.on("playerDestroy", (player) => {
    musicAccessManager.endSession(player.guildId);
    logger.info(`[Lavalink] Player destroyed for guild ${player.guildId}.`);
  });
}

/**
 * Initializes the manager against the connected client. Safe to call more
 * than once — the underlying manager no-ops if already initiated.
 */
export async function initLavalink(client: Client<true>): Promise<void> {
  if (lavalinkManager.initiated) return;

  attachClient(client);

  await lavalinkManager.init({
    id: client.user.id,
    username: client.user.username,
  });

  logger.info("[Lavalink] Manager initiated.");
}

/**
 * Forwards a raw gateway packet (VOICE_STATE_UPDATE / VOICE_SERVER_UPDATE)
 * to the manager. Safe to call before init — the manager buffers/ignores
 * packets it doesn't need yet.
 */
export function forwardRawPacket(packet: unknown): void {
  if (!lavalinkManager.initiated) return;

  void lavalinkManager.sendRawData(
    packet as Parameters<typeof lavalinkManager.sendRawData>[0],
  );
}

export default lavalinkManager;
