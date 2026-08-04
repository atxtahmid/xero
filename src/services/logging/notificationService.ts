import {
  Client,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  Role,
  TextChannel,
  User,
} from "discord.js";

import config from "../../config/index.js";
import db from "../../database/prisma.js";
import logger from "../../logger/logger.js";

const MAX_ADMIN_ROLES = 5;
const FAILURE_NOTIFY_COOLDOWN = 60_000;

export interface NotificationPayload {
  content?: string;
  embeds?: EmbedBuilder[];
}

/**
 * An independent notification layer. Any system in the bot can call into
 * this instead of re-implementing "how do I actually get this in front of
 * a human" on its own. Every layer degrades gracefully — if the best
 * delivery method isn't available, it falls back to the next one rather
 * than failing silently.
 *
 * Layer 1 — Ticket support role missing/empty -> ping up to 5 qualifying
 *           (human-containing) Administrator roles in the ticket channel,
 *           falling back to a server-owner DM if none qualify.
 * Layer 2 — Anti-Nuke event -> notify co-owners via the configured log
 *           channel if one exists, otherwise DM each co-owner directly.
 * Layer 3 — Anti-Nuke event, but no co-owners are configured at all ->
 *           DM the server owner as a last resort.
 * Layer 4 — Critical/unhandled system failure -> DM the bot's global
 *           owner. Rate-limited so a crash loop can't become a DM flood.
 */
class NotificationService {
  private lastFailureNotifyAt = 0;

  // ---------------------------------------------------------------------
  // Generic primitives
  // ---------------------------------------------------------------------

  async dmUser(
    user: User,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      await user.send(payload);
      return true;
    } catch (error) {
      logger.warn(
        `[Notification] Failed to DM ${user.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return false;
    }
  }

  async sendToChannel(
    channel: TextChannel | null | undefined,
    payload: NotificationPayload,
  ): Promise<boolean> {
    if (!channel) return false;

    try {
      await channel.send(payload);
      return true;
    } catch (error) {
      logger.warn(
        `[Notification] Failed to send to channel ${channel.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return false;
    }
  }

  private hasHumanMember(role: Role): boolean {
    return role.members.some((member) => !member.user.bot);
  }

  /**
   * Up to `limit` Administrator roles with at least one human member,
   * highest position first. Requires a full member fetch first — this
   * codebase never bulk-fetches guild members anywhere else, so
   * `role.members` would otherwise only reflect whoever happened to
   * already be cached, and could wrongly report a role as "empty" when
   * it isn't. This only runs on the rare misconfiguration path, not on
   * every ticket, so the cost is acceptable.
   */
  private async getQualifyingAdminRoles(
    guild: Guild,
    limit = MAX_ADMIN_ROLES,
  ): Promise<Role[]> {
    await guild.members.fetch().catch((error) => {
      logger.warn(
        `[Notification] Failed to fetch full member list for guild ${guild.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    });

    return guild.roles.cache
      .filter(
        (role) =>
          role.id !== guild.id &&
          !role.managed &&
          role.permissions.has(PermissionFlagsBits.Administrator),
      )
      .sort((a, b) => b.position - a.position)
      .filter((role) => this.hasHumanMember(role))
      .first(limit);
  }

  // ---------------------------------------------------------------------
  // Layer 1 — Ticket support role issues
  // ---------------------------------------------------------------------

  /**
   * Checks a ticket panel's configured support role and, if it's missing
   * or has no human members, notifies staff automatically. Returns
   * whether an issue was found (and therefore notified).
   *
   * This is the single entry point ticket code should call — it owns the
   * full member fetch, the "missing vs empty" determination, and the
   * fallback chain, so the ticket system doesn't need to know anything
   * about how admin roles are found or ranked.
   */
  async checkAndNotifyTicketSupportRole(
    channel: TextChannel,
    supportRoleId: string | null | undefined,
  ): Promise<boolean> {
    const guild = channel.guild;

    // One fetch, reused for both the support-role check below and the
    // qualifying-admin-role lookup further down.
    await guild.members.fetch().catch((error) => {
      logger.warn(
        `[Notification] Failed to fetch full member list for guild ${guild.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    });

    let reason: "missing" | "empty" | null = null;

    if (!supportRoleId) {
      reason = "missing";
    } else {
      const role = guild.roles.cache.get(supportRoleId);

      if (!role) {
        reason = "missing";
      } else if (!this.hasHumanMember(role)) {
        reason = "empty";
      }
    }

    if (!reason) {
      return false;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("⚠️ Ticket Support Role Issue")
      .setDescription(
        reason === "missing"
          ? "This ticket panel has **no support role configured**, so no staff role was automatically granted access to this ticket."
          : "This ticket's support role is configured, but currently **has no human members** (bots don't count) — no one can see this ticket through that role right now.",
      )
      .setTimestamp();

    const qualifyingRoles =
      await this.getQualifyingAdminRoles(guild);

    if (qualifyingRoles.length > 0) {
      const sent = await this.sendToChannel(channel, {
        content: qualifyingRoles
          .map((role) => `<@&${role.id}>`)
          .join(" "),
        embeds: [embed],
      });

      if (sent) return true;
    }

    // Either no Administrator role has a human member, or the channel
    // send itself failed — fall back to DMing the server owner directly
    // so this doesn't go completely unnoticed.
    logger.warn(
      `[Notification] Falling back to owner DM for ticket support role issue in guild ${guild.id}.`,
    );

    const owner = await guild.fetchOwner().catch(() => null);

    if (owner) {
      await this.dmUser(owner.user, { embeds: [embed] });
    }

    return true;
  }

  // ---------------------------------------------------------------------
  // Layer 2 & 3 — Anti-Nuke event reachability
  // ---------------------------------------------------------------------

  /**
   * Called after Anti-Nuke has already attempted to log the event to the
   * configured log channel (see antiNukeLogService.sendToChannel).
   * `channelNotified` tells this method whether that already reached a
   * channel co-owners can see, so it knows whether it still needs to DM
   * them directly.
   */
  async notifyAntiNukeEvent(
    guild: Guild,
    embed: EmbedBuilder,
    channelNotified: boolean,
  ): Promise<void> {
    const coOwners = await db.antiNukeCoOwner.findMany({
      where: { guildId: guild.id },
      select: { userId: true },
    });

    if (coOwners.length === 0) {
      // Layer 3 — no co-owners configured at all, fall back to the
      // server owner.
      const owner = await guild.fetchOwner().catch(() => null);

      if (owner) {
        await this.dmUser(owner.user, { embeds: [embed] });
      }

      return;
    }

    if (channelNotified) {
      // Co-owners can already see this in the log channel.
      return;
    }

    // Layer 2 — no log channel configured, DM every co-owner directly.
    for (const coOwner of coOwners) {
      const user = await guild.client.users
        .fetch(coOwner.userId)
        .catch(() => null);

      if (user) {
        await this.dmUser(user, { embeds: [embed] });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Layer 4 — Critical system failure
  // ---------------------------------------------------------------------

  async notifySystemFailure(
    client: Client,
    context: string,
    error: unknown,
  ): Promise<void> {
    const ownerId = config.owner.id;

    if (!ownerId) return;

    const now = Date.now();

    if (now - this.lastFailureNotifyAt < FAILURE_NOTIFY_COOLDOWN) {

      return;
    }

    if (!client.isReady()) return;

    const owner = await client.users.fetch(ownerId).catch(() => null);

    if (!owner) return;

    this.lastFailureNotifyAt = now;

    const message =
      error instanceof Error ? error.message : String(error);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🚨 Critical System Failure")
      .addFields(
        { name: "Context", value: context },
        {
          name: "Error",
          value: `\`\`\`${message.slice(0, 1000)}\`\`\``,
        },
      )
      .setTimestamp();

    await this.dmUser(owner, { embeds: [embed] });
  }
}

export default new NotificationService();