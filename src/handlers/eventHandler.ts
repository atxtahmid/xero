import { Client } from "discord.js";
import { readdirSync } from "node:fs";
import {
  dirname,
  extname,
  join,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

import logger from "../services/logger.js";
import notificationService from "../services/notificationService.js";
import type { Event } from "../types/Event.js";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  dirname(__filename);

function getEventFiles(
  directory: string,
): string[] {
  const files: string[] = [];

  const entries = readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  );

  for (const entry of entries) {
    const fullPath = join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      files.push(
        ...getEventFiles(fullPath),
      );

      continue;
    }

    const extension =
      extname(entry.name);

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
  const eventsPath = join(
    __dirname,
    "..",
    "events",
  );

  const eventFiles =
    getEventFiles(eventsPath);

  let loaded = 0;

  for (const filePath of eventFiles) {
    try {
      const module = await import(
        pathToFileURL(
          filePath,
        ).href,
      );

      const event:
        | Event
        | undefined =
        module.default ??
        module.event;

      if (
        !event?.name ||
        !event?.execute
      ) {
        logger.warn(
          `Skipping invalid event: ${filePath}`,
        );

        continue;
      }

      if (event.once) {
        client.once(
          event.name,
          (...args) =>
            void Promise.resolve(
              event.execute(...args),
            ).catch((error) => {
              logger.error(
                `Error in event ${String(
                  event.name,
                )}`,
                error,
              );

              // Layer 4 — an uncaught error inside an event handler is
              // exactly the kind of thing that should wake up the bot
              // owner, not just sit in the log file.
              void notificationService.notifySystemFailure(
                client,
                `Event handler threw: ${String(event.name)}`,
                error,
              );
            }),
        );
      } else {
        client.on(
          event.name,
          (...args) =>
            void Promise.resolve(
              event.execute(...args),
            ).catch((error) => {
              logger.error(
                `Error in event ${String(
                  event.name,
                )}`,
                error,
              );

              void notificationService.notifySystemFailure(
                client,
                `Event handler threw: ${String(event.name)}`,
                error,
              );
            }),
        );
      }

      loaded++;

      logger.info(
        `Loaded event: ${String(
          event.name,
        )}`,
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