import { Router } from "express";

import db from "../database/prisma.js";
import { requireAuth, requireGuildAccess } from "../middleware/auth.js";

const router = Router();

const PAGE_SIZE = 25;

// Read-only, same reasoning as moderation.ts: actually closing/claiming
// a ticket from the dashboard would mean sending real Discord messages
// and editing channel permissions, which needs either this service
// holding its own bot token or talking to the live bot process — a
// distinct decision, not made here.
router.get(
  "/:guildId/ticket-panels",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const panels = await db.ticketPanel.findMany({
      where: {
        guildId: req.params.guildId,
      },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json({ panels });
  },
);

router.get(
  "/:guildId/tickets",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where = {
      guildId: req.params.guildId,
      ...(status ? { status: status as any } : {}),
    };

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        include: {
          panel: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.ticket.count({
        where,
      }),
    ]);

    res.json({
      tickets,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      total,
    });
  },
);

export default router;
