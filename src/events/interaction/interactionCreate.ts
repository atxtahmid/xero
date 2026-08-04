import {
  Events,
  Collection,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";

import type { Event } from "../../types/Event.js";
import { hasPermission } from "../../utils/permissions.js";
import logger from "../../logger/logger.js";
import serverLogService from "../../services/logging/serverLogService.js";

import ticketCreateButton from "../../interactions/tickets/ticketCreateButton.js";
import ticketClaimButton from "../../interactions/tickets/ticketClaimButton.js";
import ticketUnclaimButton from "../../interactions/tickets/ticketUnclaimButton.js";
import ticketLockButton from "../../interactions/tickets/ticketLockButton.js";
import ticketUnlockButton from "../../interactions/tickets/ticketUnlockButton.js";
import ticketCloseButton from "../../interactions/tickets/ticketCloseButton.js";
import ticketDeleteButton from "../../interactions/tickets/ticketDeleteButton.js";
import ticketReopenButton from "../../interactions/tickets/ticketReopenButton.js";

const cooldowns = new Collection<string, Collection<string, number>>();

/**
 * Best-effort "name:value name:value" rendering of a slash command's
 * options, for Server Log entries — flattens one level for subcommands
 * so `/ban user:@x reason:spam` and `/settings-ai enabled:true` both
 * render sensibly. Not meant to be a complete/lossless serialization.
 */
function formatCommandOptions(
  interaction: ChatInputCommandInteraction,
): string {
  return interaction.options.data
    .flatMap((option) =>
      option.options && option.options.length > 0
        ? option.options
        : [option],
    )
    .filter((option) => option.value !== undefined)
    .map((option) => `${option.name}:${option.value}`)
    .join(" ");
}

type ButtonHandler = (interaction: ButtonInteraction) => Promise<void>;

/**
 * Maps a button's customId to its handler.
 *
 * These handlers already existed in `events/tickets/*` but were never
 * wired up anywhere — the button branch below used to be an empty
 * placeholder, so every ticket button silently did nothing when clicked.
 */
const buttonHandlers: Record<string, ButtonHandler> = {
  "ticket:create": ticketCreateButton,
  "ticket:claim": ticketClaimButton,
  "ticket:unclaim": ticketUnclaimButton,
  "ticket:lock": ticketLockButton,
  "ticket:unlock": ticketUnlockButton,
  "ticket:close": ticketCloseButton,
  "ticket:delete": ticketDeleteButton,
  "ticket:reopen": ticketReopenButton,
};

const event: Event = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  },
};

async function handleButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const handler = buttonHandlers[interaction.customId];

  if (!handler) {
    return;
  }

  try {
    await handler(interaction);
  } catch (error) {
    logger.error(
      `[Button Error] ${interaction.customId}:`,
      error,
    );

    const response = {
      content: "❌ Something went wrong handling that button.",
      ephemeral: true,
    };

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    } catch {
      // The interaction likely expired; nothing more we can do.
    }
  }
}

async function handleSlashCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const command = interaction.client.commands.get(
    interaction.commandName,
  );

  if (!command) return;

  // Guild-only enforcement — belt-and-suspenders alongside each command's
  // own `if (!interaction.guild)` check. Every command that sets
  // `guildOnly: true` currently guards this itself too, but this closes
  // the gap for any future command that forgets to.
  if (command.guildOnly && !interaction.guild) {
    await interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    });

    return;
  }

  // Permission check
  const permitted = await hasPermission(
    interaction,
    [...command.permissions],
  );

  if (!permitted) {
    await interaction.reply({
      content: "❌ You don't have permission.",
      ephemeral: true,
    });

    return;
  }

  // Cooldown
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(
      command.data.name,
      new Collection<string, number>(),
    );
  }

  const timestamps = cooldowns.get(command.data.name)!;

  const now = Date.now();
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime =
      timestamps.get(interaction.user.id)! + cooldownAmount;

    if (now < expirationTime) {
      await interaction.reply({
        content: "⚠️ Cooldown active.",
        ephemeral: true,
      });

      return;
    }
  }

  timestamps.set(interaction.user.id, now);

  setTimeout(() => {
    timestamps.delete(interaction.user.id);
  }, cooldownAmount);

  // Server Log: record command usage (which command, by whom, where) —
  // fire-and-forget so a logging failure never blocks the command
  // itself. Only meaningful in a guild; DM-run commands have no guild
  // log channel to send to.
  if (interaction.guild) {
    serverLogService
      .logCommandUsage(
        interaction.guild,
        interaction.channelId,
        interaction.user,
        interaction.commandName,
        formatCommandOptions(interaction),
      )
      .catch((error) => {
        logger.error("[Server Log] Failed to log command usage:", error);
      });
  }

  // Execute command
  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(
      `[Command Error] ${interaction.commandName}:`,
      error,
    );

    const response = {
      content: "❌ Execution failed.",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
}

export default event;
