import { Events, type Message, type PartialMessage } from "discord.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
    if (newMessage.partial) return;
    if (!newMessage.inGuild() || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    // ... Logic
  },
};
export default event;