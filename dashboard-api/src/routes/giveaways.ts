import { Router } from "express";

import db from "../database/prisma.js";
import { requireAuth, requireGuildAccess } from "../middleware/auth.js";

const router = Router();

const PAGE_SIZE = 25;

// Read-only for the same reason as tickets.ts/moderation.ts — creating,
// ending, or rerolling a giveaway from the dashboard needs to actually
// touch Discord (post messages, read reactions), which this service
// currently has no way to do on its own.
router.get(
  "/:guildId/giveaways",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const status = req.query.status; // "active" | "ended" | undefined

    const where = {
      guildId: req.params.guildId,
      ...(status === "active" ? { ended: false } : {}),
      ...(status === "ended" ? { ended: true } : {}),
    };

    const [giveaways, total] = await Promise.all([
      db.giveaway.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.giveaway.count({
        where,
      }),
    ]);

    res.json({
      giveaways,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      total,
    });
  },
);

export default router;
