import { Router } from "express";
import { z } from "zod";

import db from "../database/prisma.js";
import { emitToGuild } from "../socket/socketService.js";
import { requireAuth, requireGuildAccess } from "../middleware/auth.js";

const router = Router();

// Deliberately NOT included here, even though they're columns on
// GuildSettings:
//  - trustedOwnerId: only ever settable via /owner-bypass claim by the
//    bot's GLOBAL owner. Exposing it to anyone with plain "Manage
//    Server" would be a privilege escalation past what the bot's own
//    command permissions allow.
//  - antiNukeLogChannelId: on the bot, /antinuke-log requires being the
//    server owner or a registered Anti-Nuke co-owner (isHighlyTrusted),
//    which is stricter than the "Manage Server" permission this whole
//    API authenticates against. Same reasoning — don't let the
//    dashboard grant more than the equivalent slash command would.
const updateSettingsSchema = z
  .object({
    aiEnabled: z.boolean(),
    searchEnabled: z.boolean(),
    logChannelId: z.string().nullable(),
    serverLogChannelId: z.string().nullable(),
    aiLogChannelId: z.string().nullable(),
    welcomeChannelId: z.string().nullable(),
    welcomeMessage: z.string().max(1000).nullable(),
    leaveMessage: z.string().max(1000).nullable(),
    autoRoleId: z.string().nullable(),
    modRoleId: z.string().nullable(),
    adminRoleId: z.string().nullable(),
    djRoleId: z.string().nullable(),
    musicDefaultVolume: z.number().int().min(0).max(150),
  })
  .partial();

router.get(
  "/:guildId/settings",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const settings = await db.guildSettings.findUnique({
      where: {
        guildId: req.params.guildId,
      },
    });

    if (!settings) {
      res.status(404).json({ error: "No settings found for this server yet." });
      return;
    }

    const { trustedOwnerId, antiNukeLogChannelId, ...safeSettings } = settings;

    res.json(safeSettings);
  },
);

router.put(
  "/:guildId/settings",
  requireAuth,
  requireGuildAccess,
  async (req, res) => {
    const parsed = updateSettingsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid settings payload.",
        details: parsed.error.flatten(),
      });
      return;
    }

    const updated = await db.guildSettings.upsert({
      where: {
        guildId: req.params.guildId,
      },
      update: parsed.data,
      create: {
        guildId: req.params.guildId,
        ...parsed.data,
      },
    });

    const { trustedOwnerId, antiNukeLogChannelId, ...safeSettings } = updated;

    emitToGuild(req.params.guildId, "settings-updated", safeSettings);

    res.json(safeSettings);
  },
);

export default router;
