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

import {
  ticketCreateButton,
  ticketClaimButton,
  ticketUnclaimButton,
  ticketLockButton,
  ticketUnlockButton,
  ticketCloseButton,
  ticketDeleteButton,
  ticketReopenButton,
} from "../tickets/index.js";

// Internal cooldown tracker
const cooldowns = new Collection<string, Collection<string, number>>();

const event: Event = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }
  },
};

async function handleSlashCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) return;

  // 1. Guild-Only Check
  if (command.guildOnly && !interaction.guild) {
    await interaction.reply({
      content: "❌ This command can only be used within a server.",
      ephemeral: true,
    });
    return;
  }

  // 2. Custom Permission System Enforcement
  // This bridges the gaps where Discord's default permissions are insufficient
  const permitted = await hasPermission(interaction, command.permissions);
  if (!permitted) {
    await interaction.reply({
      content: "❌ You do not have the required bot-level permissions to use this command.",
      ephemeral: true,
    });
    return;
  }

  // 3. Cooldown Handling
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name)!;
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

    if (now < expirationTime) {
      const expired = Math.round(expirationTime / 1000);
      await interaction.reply({
        content: `⚠️ Please wait, you are on a cooldown. You can use this command again <t:${expired}:R>.`,
        ephemeral: true,
      });
      return;
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  // 4. Execution
  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`[Command Error] ${interaction.commandName}:`, error);

    const reply = {
      content: "❌ An internal error occurred while executing this command.",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  try {
    switch (interaction.customId) {
      case "ticket:create":
        await ticketCreateButton(interaction);
        break;
      case "ticket:claim":
        await ticketClaimButton(interaction);
        break;
      case "ticket:unclaim":
        await ticketUnclaimButton(interaction);
        break;
      case "ticket:lock":
        await ticketLockButton(interaction);
        break;
      case "ticket:unlock":
        await ticketUnlockButton(interaction);
        break;
      case "ticket:close":
        await ticketCloseButton(interaction);
        break;
      case "ticket:delete":
        await ticketDeleteButton(interaction);
        break;
      case "ticket:reopen":
        await ticketReopenButton(interaction);
        break;
    }
  } catch (error) {
    logger.error(`[Button Error] ${interaction.customId}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Button action failed.", ephemeral: true }).catch(() => {});
    }
  }
}

export default event;