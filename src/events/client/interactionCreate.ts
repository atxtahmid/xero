import {
  ChatInputCommandInteraction,
  Events,
} from "discord.js";

import logger from "../../services/logger.js";
import { hasPermission } from "../../utils/permissions.js";
import type { Command } from "../../types/Command.js";

const event = {
  name: Events.InteractionCreate,

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command =
      interaction.client.commands.get(
        interaction.commandName,
      ) as Command | undefined;

    if (!command) {
      logger.warn(
        `Unknown command: ${interaction.commandName}`,
      );

      await interaction.reply({
        content:
          "❌ This command is not available.",
        ephemeral: true,
      });

      return;
    }

    try {
      logger.info(
        `Command received: ${interaction.commandName} ` +
        `from ${interaction.user.tag} ` +
        `(${interaction.user.id})`,
      );

      // Guild-only commands
      if (
        command.guildOnly &&
        !interaction.guild
      ) {
        await interaction.reply({
          content:
            "❌ This command can only be used in a server.",
          ephemeral: true,
        });

        return;
      }

      // Permission check
      const allowed =
        await hasPermission(
          interaction,
          command.permissions,
        );

      logger.info(
        `Permission result for ` +
        `${interaction.user.id}: ${allowed}`,
      );

      if (!allowed) {
        await interaction.reply({
          content:
            "❌ You don't have permission to use this command.",
          ephemeral: true,
        });

        return;
      }

      await command.execute(
        interaction,
      );
    } catch (error) {
      logger.error(
        `Error handling command ` +
        `${interaction.commandName} ` +
        `for ${interaction.user.id}`,
        error,
      );

      const response = {
        content:
          "❌ An unexpected error occurred while executing this command.",
        ephemeral: true,
      };

      try {
        if (
          interaction.replied ||
          interaction.deferred
        ) {
          await interaction.followUp(
            response,
          );
        } else {
          await interaction.reply(
            response,
          );
        }
      } catch (replyError) {
        logger.error(
          "Failed to send command error response",
          replyError,
        );
      }
    }
  },
};

export default event;