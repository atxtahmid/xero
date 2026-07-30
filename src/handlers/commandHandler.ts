import { Collection, Client } from "discord.js";
import { readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import logger from "../services/logger.js";
import type { Command } from "../types/Command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client: Client): Promise<void> {
  const commands = new Collection<string, Command>();
  const commandsPath = join(__dirname, "..", "commands");

  let loadedCount = 0;

  const folders = readdirSync(commandsPath, {
    withFileTypes: true,
  });

  for (const folder of folders) {
    if (!folder.isDirectory()) {
      continue;
    }

    const folderPath = join(commandsPath, folder.name);

    const commandFiles = readdirSync(folderPath).filter((file) => {
      const extension = extname(file);
      return extension === ".js" || extension === ".ts";
    });

    // Optimization: Skip empty folders
    if (commandFiles.length === 0) continue;

    for (const file of commandFiles) {
      try {
        const filePath = join(folderPath, file);
        const module = await import(pathToFileURL(filePath).href);

        /**
         * Support multiple export patterns:
         * 1. export default command;
         * 2. export default [command1, command2];
         * 3. export const command = ...;
         */
        const rawExports = module.default ?? module.command;
        const exportsArray = Array.isArray(rawExports) ? rawExports : [rawExports];

        for (const cmd of exportsArray) {
          // Validate structure before adding to collection
          if (!cmd?.data?.name || !cmd?.execute) {
            continue;
          }

          if (commands.has(cmd.data.name)) {
            logger.warn(`Duplicate command name detected: "${cmd.data.name}". Overwriting the previous instance.`);
          }

          commands.set(cmd.data.name, cmd);
          loadedCount++;
        }
      } catch (error) {
        logger.error(`[CommandHandler] Failed to load ${file}:`, error);
      }
    }
  }

  client.commands = commands;

  logger.info(`Successfully initialized ${loadedCount} command(s).`);
}