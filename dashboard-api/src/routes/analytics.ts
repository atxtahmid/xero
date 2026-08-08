import { Router } from "express";

import db from "../database/prisma.js";
import { requireAuth, requireGuildAccess } from "../middleware/auth.js";

const router = Router();
const DEFAULT_WINDOW_DAYS = 30;

/**
 * Summary numbers derivable from what's actually stored today. Explicitly
 * NOT included: member growth over time — nothing in the schema takes
 * periodic member-count snapshots, so a growth chart isn't something
 * this endpoint can honestly produce yet. Flagging that here rather than
 * faking it with a single current count.
 */
router.get(
  "/:guildId/analytics",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const guildId = req.params.guildId;
    const days = Math.max(1, Number(req.query.days) || DEFAULT_WINDOW_DAYS);
    const windowStart = new Date(Date.now() - days * 86_400_000);

    const [
      totalCases,
      recentCases,
      casesByAction,
      totalWarnings,
      recentWarnings,
      totalTickets,
      openTickets,
      closedTicketsForResolution,
      totalGiveaways,
      endedGiveaways,
    ] = await Promise.all([
      db.case.count({ where: { guildId } }),
      db.case.count({ where: { guildId, createdAt: { gte: windowStart } } }),
      db.case.groupBy({
        by: ["action"],
        where: { guildId },
        _count: { action: true },
      }),
      db.warning.count({ where: { guildId } }),
      db.warning.count({ where: { guildId, createdAt: { gte: windowStart } } }),
      db.ticket.count({ where: { guildId } }),
      db.ticket.count({ where: { guildId, status: "OPEN" } }),
      db.ticket.findMany({
        where: { guildId, status: "CLOSED", closedAt: { not: null } },
        select: { createdAt: true, closedAt: true },
      }),
      db.giveaway.count({ where: { guildId } }),
      db.giveaway.findMany({
        where: { guildId, ended: true },
        select: { winnerIds: true },
      }),
    ]);

    const avgResolutionMs =
      closedTicketsForResolution.length > 0
        ? closedTicketsForResolution.reduce(
            (sum, t) => sum + (t.closedAt!.getTime() - t.createdAt.getTime()),
            0,
          ) / closedTicketsForResolution.length
        : null;

    const totalGiveawayWinners = endedGiveaways.reduce(
      (sum, g) => sum + g.winnerIds.length,
      0,
    );

    res.json({
      windowDays: days,
      moderation: {
        totalCases,
        casesInWindow: recentCases,
        casesByAction: Object.fromEntries(
          casesByAction.map((row) => [row.action, row._count.action]),
        ),
        totalWarnings,
        warningsInWindow: recentWarnings,
      },
      tickets: {
        total: totalTickets,
        open: openTickets,
        closed: totalTickets - openTickets,
        averageResolutionMs: avgResolutionMs,
      },
      giveaways: {
        totalHosted: totalGiveaways,
        totalEnded: endedGiveaways.length,
        totalWinnersDrawn: totalGiveawayWinners,
      },
    });
  },
);

export default router;
