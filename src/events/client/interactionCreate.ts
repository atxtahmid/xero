import {
  Events,
  Collection,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";

import type { Event } from "../../types/Event.js";
import { hasPermission } from "../../utils/permissions.js";
import logger from "../../services/logger.js";

import ticketCreateButton from "../tickets/ticketCreateButton.js";
import ticketClaimButton from "../tickets/ticketClaimButton.js";
import ticketUnclaimButton from "../tickets/ticketUnclaimButton.js";
import ticketLockButton from "../tickets/ticketLockButton.js";
import ticketUnlockButton from "../tickets/ticketUnlockButton.js";
import ticketCloseButton from "../tickets/ticketCloseButton.js";
import ticketDeleteButton from "../tickets/ticketDeleteButton.js";
import ticketReopenButton from "../tickets/ticketReopenButton.js";

const cooldowns = new Collection<string, Collection<string, number>>();

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
