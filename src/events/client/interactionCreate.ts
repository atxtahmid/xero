import {
  ChatInputCommandInteraction,
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import { hasPermission } from "../../utils/permissions.js";
import type { Command } from "../../types/Command.js";

const event = {
  name: Events.InteractionCreate,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = interaction.client.commands.get(
      interaction.commandName,
    ) as Command | undefined;

    if (!command) {
      logger.warn(
        `Unknown command: ${interaction.commandName}`,
      );

      return interaction.reply({
        content:
          "❌ This command is not available.",
        ephemeral: true,
      });
    }

    // Guild-only commands
    if (command.guildOnly && !interaction.guild) {
      return interaction.reply({
        content:
          "❌ This command can only be used in a server.",
        ephemeral: true,
      });
    }

    // Permission check
    if (
      !(await hasPermission(
        interaction,
        command.permissions,
      ))
    ) {
      return interaction.reply({
        content:
          "❌ You don't have permission to use this command.",
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(
        `Error executing command: ${interaction.commandName}`,
        error,
      );

      const response = {
        content:
          "❌ An unexpected error occurred while executing this command.",
        ephemeral: true,
      };

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
  },
};

export default event;