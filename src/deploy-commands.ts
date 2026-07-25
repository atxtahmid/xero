import "dotenv/config";

import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import config from "./config/index.js";
import logger from "./services/logger.js";
import type { Command } from "./types/Command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployCommands(): Promise<void> {
  const commands: object[] = [];

  const commandsPath = join(__dirname, "commands");
  const folders = readdirSync(commandsPath, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;

    const folderPath = join(commandsPath, folder.name);

    const commandFiles = readdirSync(folderPath).filter((file) => {
      const extension = extname(file);
      return extension === ".ts" || extension === ".js";
    });

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);

      const module = await import(pathToFileURL(filePath).href);

      const command: Command | undefined =
        module.default ?? module.command;

      if (!command?.data) {
        logger.warn(`Skipping invalid command: ${file}`);
        continue;
      }

      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: "10" }).setToken(
    config.discord.token
  );

  try {
    logger.info(`Deploying ${commands.length} slash command(s)...`);

    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      {
        body: commands,
      }
    );

    logger.info("Slash commands deployed successfully.");
  } catch (error) {
    logger.error("Failed to deploy slash commands.", error);
  }
}

void deployCommands();