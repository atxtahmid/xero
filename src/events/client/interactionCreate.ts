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

const cooldowns = new Collection<string, Collection<string, number>>();

const event: Event = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      // Button handling logic...
    }
  },
};

async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  // 1. Permission check
  const permitted = await hasPermission(interaction, command.permissions);
  if (!permitted) {
    await interaction.reply({ content: "❌ You don't have permission.", ephemeral: true });
    return;
  }

  // 2. Cooldown check
  if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Collection());
  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name)!;
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
    if (now < expirationTime) {
      await interaction.reply({ content: "⚠️ Cooldown active.", ephemeral: true });
      return;
    }
  }
  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  // 3. Execution
  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`[Command Error] ${interaction.commandName}:`, error);
    const msg = { content: "❌ Execution failed.", ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(msg);
    else await interaction.reply(msg);
  }
}

export default event;