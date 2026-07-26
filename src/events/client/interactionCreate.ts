import {
  ChatInputCommandInteraction,
  Events,
} from "discord.js";

import logger from "../services/logger.js";
import type { Event } from "../types/Event.js";

const event: Event<"interactionCreate"> = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);

      await interaction.reply({
        content: "❌ This command is not available.",
        ephemeral: true,
      });

      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      logger.error(
        `Error executing command: ${interaction.commandName}`,
        error
      );

      const response = {
        content: "❌ An unexpected error occurred while executing this command.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
  },
};

export default event;