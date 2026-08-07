import { Router } from "express";

import db from "../database/prisma.js";
import { requireAuth, requireGuildAccess } from "../middleware/auth.js";

const router = Router();

const PAGE_SIZE = 25;

/**
 * Read-only for this first pass — viewing case history, not performing
 * moderation actions from the dashboard. Actually banning/kicking/
 * warning someone from here would mean this service either duplicates
 * Discord REST calls with the bot's own token, or talks to the live bot
 * process somehow — a real design decision on its own, deliberately not
 * made here without confirming it first.
 */
router.get(
  "/:guildId/moderation/cases",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);

    const [cases, total] = await Promise.all([
      db.case.findMany({
        where: {
          guildId: req.params.guildId,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.case.count({
        where: {
          guildId: req.params.guildId,
        },
      }),
    ]);

    res.json({
      cases,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      total,
    });
  },
);

router.get(
  "/:guildId/moderation/warnings",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

    const warnings = await db.warning.findMany({
      where: {
        guildId: req.params.guildId,
        ...(userId ? { userId } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    res.json({ warnings });
  },
);

export default router;
