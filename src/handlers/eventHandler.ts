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

function getEventFiles(directory: string): string[] {
  const files: string[] = [];

  const entries = readdirSync(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getEventFiles(fullPath));
      continue;
    }

    const extension = extname(entry.name);

    if (
      extension === ".ts" ||
      extension === ".js"
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function loadEvents(
  client: Client,
): Promise<void> {
  const eventsPath = join(__dirname, "..", "events");

  let loaded = 0;

  const eventFiles = getEventFiles(eventsPath);

  for (const filePath of eventFiles) {
    try {
      const module = await import(
        pathToFileURL(filePath).href
      );

      const event: Event | undefined =
        module.default ?? module.event;

      if (!event?.name || !event?.execute) {
        logger.warn(
          `Skipping invalid event: ${filePath}`,
        );
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) =>
          void event.execute(...args),
        );
      } else {
        client.on(event.name, (...args) =>
          void event.execute(...args),
        );
      }

      loaded++;

      logger.info(
        `Loaded event: ${event.name}`,
      );
    } catch (error) {
      logger.error(
        `Failed to load event: ${filePath}`,
        error,
      );
    }
  }

  logger.info(
    `Successfully loaded ${loaded} event(s).`,
  );
}