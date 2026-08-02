import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";

import config from "./config/index.js";
import { loadCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";
import backupScheduler from "./services/backupScheduler.js";
import lockdownScheduler from "./services/lockdownScheduler.js";
import tempBanScheduler from "./services/tempBanScheduler.js";
import logger from "./services/logger.js";
import notificationService from "./services/notificationService.js";
import type { Command } from "./types/Command.js";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

// Layer 4 — these fire on truly uncaught errors anywhere in the process
// (including outside Discord event handlers, e.g. a raw DB connection
// drop). `client` is referenced here even though it's declared further
// below: these callbacks only ever run asynchronously, after the whole
// module has finished loading and `client` is already assigned, so this
// is safe. `notifySystemFailure` itself no-ops safely if the client
// isn't logged in yet.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection:", reason);

  void notificationService.notifySystemFailure(
    client,
    "Unhandled Promise Rejection",
    reason,
  );
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);

  void notificationService.notifySystemFailure(
    client,
    "Uncaught Exception",
    error,
  );
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
  ],
});

client.commands = new Collection<string, Command>();

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(
    `Logged in as ${readyClient.user.tag}`,
  );

  try {
    await backupScheduler.start(readyClient);
    lockdownScheduler.start(readyClient);
    tempBanScheduler.start(readyClient);

    logger.info(
      "Background services started.",
    );
  } catch (error) {
    logger.error(
      "Failed to start background services:",
      error,
    );
  }
});

async function shutdown(
  signal: string,
): Promise<void> {
  logger.info(
    `Received ${signal}. Shutting down...`,
  );

  try {
    backupScheduler.stop();

    client.destroy();

    logger.info("Shutdown complete.");
  } catch (error) {
    logger.error(
      "Shutdown failed:",
      error,
    );
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

async function start(): Promise<void> {
  try {
    await loadCommands(client);
    await loadEvents(client);

    await client.login(
      config.discord.token,
    );
  } catch (error) {
    logger.error(
      "Startup failed:",
      error,
    );

    process.exit(1);
  }
}

void start();