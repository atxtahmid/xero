import { Events, type Message, type PartialMessage } from "discord.js";
import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageDelete> = {
  name: Events.MessageDelete,

  async execute(
    message: Message | PartialMessage,
  ): Promise<void> {
    // 1. Guard: Ignore deletions outside of servers (DMs)
    if (!message.inGuild()) {
      return;
    }

    // 2. Handle Partials
    // If a message was sent while the bot was offline, Discord sends a 'Partial'.
    // We cannot see the author or content of a deleted partial because it no longer exists to fetch.
    if (message.partial) {
      // Logic space for Anti-Nuke: Even if content is gone, we know a message was deleted.
      return;
    }

    // 3. Guard: Ignore bot message deletions
    if (message.author?.bot) {
      return;
    }

    try {
      // Logic space reserved for production features:
      // - Logging: Send the deleted content and author to the log channel.
      // - Anti-Nuke: Increment deletion counter for mass-deletion protection.
      // - AI Sync: Optionally remove the message from user context if needed.
      
      logger.info(`Message deleted in ${message.guild.name} by ${message.author.tag}`);
    } catch (error) {
      logger.error("Error processing MessageDelete event:", error);
    }
  },
};

export default event;