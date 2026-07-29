import { Events } from "discord.js";
import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    logger.info(
      `[RAW INTERACTION] ${interaction.type} ${interaction.user.tag}`
    );

    if (!interaction.isChatInputCommand()) {
      return;
    }

    logger.info(
      `[COMMAND] ${interaction.commandName}`
    );

    await interaction.reply({
      content: "Interaction reached the bot.",
      ephemeral: true,
    });
  },
};

export default event;