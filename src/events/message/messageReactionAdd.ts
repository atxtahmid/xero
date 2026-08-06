import {
  Events,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";

import giveawayService, {
  GIVEAWAY_EMOJI,
} from "../../services/giveaways/giveawayService.js";
import logger from "../../logger/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.MessageReactionAdd> = {
  name: Events.MessageReactionAdd,

  async execute(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    if (user.bot) return;
    if (reaction.emoji.name !== GIVEAWAY_EMOJI) return;

    try {
      if (reaction.partial) {
        reaction = await reaction.fetch();
      }
    } catch (error) {
      logger.error("[Giveaway] Failed to fetch partial reaction:", error);
      return;
    }

    const giveaway = await giveawayService.findByMessageId(reaction.message.id);

    if (!giveaway || giveaway.ended) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const result = giveawayService.checkEligibility(member, giveaway);

    if (result.eligible) return;

    // Disqualified — remove their entry immediately rather than letting
    // them believe they're entered until the draw silently excludes
    // them. Best-effort: if the reaction removal or DM fails (e.g. DMs
    // closed), the draw-time re-check in giveawayService.end() still
    // catches it either way.
    await reaction.users.remove(user.id).catch(() => {});

    await member
      .send(
        `You weren't entered into the giveaway for **${giveaway.prize}** — ${result.reason}`,
      )
      .catch(() => {});
  },
};

export default event;
