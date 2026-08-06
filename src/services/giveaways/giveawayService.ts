import {
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  TextChannel,
  User,
} from "discord.js";

import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";

export const GIVEAWAY_EMOJI = "🎉";

export interface GiveawayRequirements {
  requiredRoleId?: string | null;
  minAccountAgeDays?: number | null;
  minServerJoinDays?: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

class GiveawayService {
  /**
   * Pure requirement check, reused by both the real-time reaction
   * handler (immediately removes + DMs a disqualified entrant) and the
   * draw logic at giveaway-end (defense in depth — someone may have
   * qualified when they reacted but no longer does by the time the
   * giveaway ends, e.g. a required role was removed from them since).
   */
  checkEligibility(
    member: GuildMember,
    requirements: GiveawayRequirements,
  ): EligibilityResult {
    if (
      requirements.requiredRoleId &&
      !member.roles.cache.has(requirements.requiredRoleId)
    ) {
      return {
        eligible: false,
        reason: `you need the <@&${requirements.requiredRoleId}> role to enter.`,
      };
    }

    if (requirements.minAccountAgeDays) {
      const accountAgeDays =
        (Date.now() - member.user.createdTimestamp) / 86_400_000;

      if (accountAgeDays < requirements.minAccountAgeDays) {
        return {
          eligible: false,
          reason: `your account must be at least ${requirements.minAccountAgeDays} day(s) old to enter.`,
        };
      }
    }

    if (requirements.minServerJoinDays && member.joinedTimestamp) {
      const membershipDays =
        (Date.now() - member.joinedTimestamp) / 86_400_000;

      if (membershipDays < requirements.minServerJoinDays) {
        return {
          eligible: false,
          reason: `you must have been in the server for at least ${requirements.minServerJoinDays} day(s) to enter.`,
        };
      }
    }

    return {
      eligible: true,
    };
  }

  private buildEmbed(
    prize: string,
    hostId: string,
    winnerCount: number,
    endsAt: Date,
    requirements: GiveawayRequirements,
    ended: boolean,
    winnerIds: string[] = [],
  ): EmbedBuilder {
    const requirementLines: string[] = [];

    if (requirements.requiredRoleId) {
      requirementLines.push(`• Role: <@&${requirements.requiredRoleId}>`);
    }

    if (requirements.minAccountAgeDays) {
      requirementLines.push(`• Account age: ${requirements.minAccountAgeDays}+ day(s)`);
    }

    if (requirements.minServerJoinDays) {
      requirementLines.push(`• Server membership: ${requirements.minServerJoinDays}+ day(s)`);
    }

    const embed = new EmbedBuilder()
      .setColor(ended ? 0x2f3136 : 0x5865f2)
      .setTitle(ended ? `🎉 Giveaway Ended: ${prize}` : `🎉 ${prize}`)
      .addFields(
        {
          name: "Host",
          value: `<@${hostId}>`,
          inline: true,
        },
        {
          name: "Winners",
          value: `${winnerCount}`,
          inline: true,
        },
        {
          name: ended ? "Ended" : "Ends",
          value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
          inline: true,
        },
      )
      .setFooter({
        text: ended
          ? "Giveaway ended"
          : `React with ${GIVEAWAY_EMOJI} to enter`,
      })
      .setTimestamp(endsAt);

    if (requirementLines.length > 0) {
      embed.addFields({
        name: "Requirements",
        value: requirementLines.join("\n"),
      });
    }

    if (ended) {
      embed.addFields({
        name: "Winner(s)",
        value:
          winnerIds.length > 0
            ? winnerIds.map((id) => `<@${id}>`).join(", ")
            : "No valid entries — no winner could be drawn.",
      });
    }

    return embed;
  }

  async create(
    guild: Guild,
    channel: TextChannel,
    host: User,
    prize: string,
    winnerCount: number,
    durationMs: number,
    requirements: GiveawayRequirements,
  ) {
    const endsAt = new Date(Date.now() + durationMs);

    const embed = this.buildEmbed(
      prize,
      host.id,
      winnerCount,
      endsAt,
      requirements,
      false,
    );

    const message = await channel.send({
      embeds: [embed],
    });

    await message.react(GIVEAWAY_EMOJI);

    await db.guild.upsert({
      where: {
        id: guild.id,
      },
      update: {},
      create: {
        id: guild.id,
      },
    });

    return db.giveaway.create({
      data: {
        guildId: guild.id,
        channelId: channel.id,
        messageId: message.id,
        hostId: host.id,
        prize,
        winnerCount,
        endsAt,
        requiredRoleId: requirements.requiredRoleId ?? null,
        minAccountAgeDays: requirements.minAccountAgeDays ?? null,
        minServerJoinDays: requirements.minServerJoinDays ?? null,
      },
    });
  }

  async findByMessageId(messageId: string) {
    return db.giveaway.findUnique({
      where: {
        messageId,
      },
    });
  }

  async findExpired() {
    return db.giveaway.findMany({
      where: {
        ended: false,
        endsAt: {
          lte: new Date(),
        },
      },
    });
  }

  /**
   * Fetches the live 🎉 reactors on a giveaway message, filters out bots
   * and anyone who no longer meets the requirements (re-checked here as
   * defense in depth), and returns the eligible member pool.
   */
  private async getEligibleEntrants(
    client: Client,
    giveaway: {
      guildId: string;
      channelId: string;
      messageId: string;
      requiredRoleId: string | null;
      minAccountAgeDays: number | null;
      minServerJoinDays: number | null;
    },
    excludeUserIds: string[] = [],
  ): Promise<GuildMember[]> {
    const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
    if (!guild) return [];

    const channel = await guild.channels
      .fetch(giveaway.channelId)
      .catch(() => null);
    if (!(channel instanceof TextChannel)) return [];

    const message = await channel.messages
      .fetch(giveaway.messageId)
      .catch(() => null);
    if (!message) return [];

    const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
    if (!reaction) return [];

    const reactors = await reaction.users.fetch().catch(() => null);
    if (!reactors) return [];

    const eligible: GuildMember[] = [];

    for (const user of reactors.values()) {
      if (user.bot) continue;
      if (excludeUserIds.includes(user.id)) continue;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) continue;

      const result = this.checkEligibility(member, giveaway);
      if (result.eligible) {
        eligible.push(member);
      }
    }

    return eligible;
  }

  private pickWinners(
    pool: GuildMember[],
    count: number,
  ): GuildMember[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async end(client: Client, giveawayId: string): Promise<void> {
    const giveaway = await db.giveaway.findUnique({
      where: {
        id: giveawayId,
      },
    });

    if (!giveaway || giveaway.ended) return;

    const eligible = await this.getEligibleEntrants(client, giveaway);
    const winners = this.pickWinners(eligible, giveaway.winnerCount);
    const winnerIds = winners.map((m) => m.id);

    await db.giveaway.update({
      where: {
        id: giveaway.id,
      },
      data: {
        ended: true,
        winnerIds,
      },
    });

    const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
    const channel = guild
      ? await guild.channels.fetch(giveaway.channelId).catch(() => null)
      : null;

    if (!(channel instanceof TextChannel)) return;

    const embed = this.buildEmbed(
      giveaway.prize,
      giveaway.hostId,
      giveaway.winnerCount,
      giveaway.endsAt,
      giveaway,
      true,
      winnerIds,
    );

    await channel.messages
      .fetch(giveaway.messageId)
      .then((message) => message.edit({ embeds: [embed] }))
      .catch(() => {});

    await channel
      .send({
        content:
          winnerIds.length > 0
            ? `🎉 Congratulations ${winnerIds.map((id) => `<@${id}>`).join(", ")}! You won **${giveaway.prize}**!`
            : `😔 No valid entries for **${giveaway.prize}** — no winner could be drawn.`,
      })
      .catch(() => {});

    logger.info(
      `[Giveaway] Ended ${giveaway.id} in guild ${giveaway.guildId} with ${winnerIds.length} winner(s).`,
    );
  }

  async reroll(client: Client, giveawayId: string) {
    const giveaway = await db.giveaway.findUnique({
      where: {
        id: giveawayId,
      },
    });

    if (!giveaway) {
      throw new Error("Giveaway not found.");
    }

    if (!giveaway.ended) {
      throw new Error("This giveaway hasn't ended yet.");
    }

    // Exclude previous winners so a reroll doesn't just re-pick them.
    const eligible = await this.getEligibleEntrants(
      client,
      giveaway,
      giveaway.winnerIds,
    );

    const newWinners = this.pickWinners(eligible, giveaway.winnerCount);
    const newWinnerIds = newWinners.map((m) => m.id);

    await db.giveaway.update({
      where: {
        id: giveaway.id,
      },
      data: {
        winnerIds: newWinnerIds,
      },
    });

    return newWinnerIds;
  }
}

export default new GiveawayService();
