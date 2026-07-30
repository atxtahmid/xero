import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events,
} from "discord.js";

import config from "./config/index.js";
import logger from "./services/logger.js";
import type { Command } from "./types/Command.js";
import { loadCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";
import backupScheduler from "./services/backupScheduler.js";

// 1. Critical: Process Error Handling
// Prevents the bot from entering a crash loop on Railway due to unhandled async errors.
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  // Optional: Graceful shutdown if error is severe
});

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

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

// 2. Critical: Backup Scheduler Integration
client.once(Events.ClientReady, async (readyClient) => {
  try {
    // Start the automatic backup cycle once the client is ready
    await backupScheduler.start(readyClient);
    logger.info("Background services (Backup Scheduler) started.");
  } catch (error) {
    logger.error("Failed to initialize background services:", error);
  }
});

try {
  // Load local command and event handlers
  await loadCommands(client);
  await loadEvents(client);

  await client.login(config.discord.token);

  logger.info("Bot logged in successfully.");
} catch (error) {
  logger.error(`Startup failed: ${error}`);
  process.exit(1);
}