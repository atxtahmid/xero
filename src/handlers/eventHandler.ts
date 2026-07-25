import { Client } from "discord.js";
import { readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import logger from "../services/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Event {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, "..", "events");

  let loaded = 0;

  const eventFiles = readdirSync(eventsPath).filter((file) => {
    const extension = extname(file);
    return extension === ".js" || extension === ".ts";
  });

  for (const file of eventFiles) {
    try {
      const filePath = join(eventsPath, file);

      const module = await import(pathToFileURL(filePath).href);

      const event: Event | undefined =
        module.default ?? module.event;

      if (!event?.name || !event?.execute) {
        logger.warn(`Skipping invalid event: ${file}`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => void event.execute(...args));
      } else {
        client.on(event.name, (...args) => void event.execute(...args));
      }

      loaded++;

      logger.info(`Loaded event: ${event.name}`);
    } catch (error) {
      logger.error(`Failed to load event: ${file}`, error);
    }
  }

  logger.info(`Successfully loaded ${loaded} event(s).`);
}