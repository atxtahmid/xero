import {
  Client,
  Collection,
  GatewayIntentBits,
} from "discord.js";

import config from "./config/index.js";
import logger from "./services/logger.js";
import type { Command } from "./types/Command.js";
import { loadCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection<string, Command>();

await loadCommands(client);
await loadEvents(client);

client.login(config.discord.token).catch((error) => {
  logger.error(`Failed to login: ${error}`);
  process.exit(1);
});