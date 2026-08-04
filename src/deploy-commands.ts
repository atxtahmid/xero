import "dotenv/config";
import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import config from "./config/index.js";
import logger from "./logger/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployCommands(): Promise<void> {
  // 1. Critical: Validate Credentials
  if (!config.discord.token || !config.discord.clientId) {
    logger.error("Deployment failed: DISCORD_TOKEN or CLIENT_ID is missing in environment variables.");
    process.exit(1);
  }

  const commands: object[] = [];
  const commandNames = new Set<string>();
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
      try {
        const filePath = join(folderPath, file);
        const module = await import(pathToFileURL(filePath).href);

        // Normalize exports: Support default export, named 'command', or an array of commands
        const rawExports = module.default ?? module.command;
        const exports = Array.isArray(rawExports) ? rawExports : [rawExports];

        for (const command of exports) {
          if (!command?.data || !command?.execute) continue;

          const name = command.data.name;

          // 2. Important: Duplicate Name Detection
          if (commandNames.has(name)) {
            logger.warn(`Duplicate command detected: "${name}" in ${file}. Skipping second instance.`);
            continue;
          }

          commandNames.add(name);
          commands.push(command.data.toJSON());
        }
      } catch (error) {
        logger.error(`Failed to load command file: ${file}`, error);
      }
    }
  }

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    logger.info(`Deploying ${commands.length} unique slash command(s)...`);

    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commands }
    );

    logger.info("Slash commands deployed successfully.");
  } catch (error) {
    logger.error("Failed to deploy slash commands to Discord API.", error);
    process.exitCode = 1;
  }
}

void deployCommands();