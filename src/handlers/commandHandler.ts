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

  let loaded = 0;

  const folders = readdirSync(commandsPath, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;

    const folderPath = join(commandsPath, folder.name);

    const commandFiles = readdirSync(folderPath).filter((file) => {
      const extension = extname(file);
      return extension === ".js" || extension === ".ts";
    });

    for (const file of commandFiles) {
      try {
        const filePath = join(folderPath, file);

        const module = await import(pathToFileURL(filePath).href);

        const command: Command | undefined =
          module.default ?? module.command;

        if (!command?.data || !command?.execute) {
          logger.warn(`Skipping invalid command: ${file}`);
          continue;
        }

        commands.set(command.data.name, command);
        loaded++;

        logger.info(`Loaded command: ${command.data.name}`);
      } catch (error) {
        logger.error(`Failed to load command: ${file}`, error);
      }
    }
  }

  client.commands = commands;

  logger.info(`Successfully loaded ${loaded} command(s).`);
}