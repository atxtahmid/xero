import { Router } from "express";

import dashboardSessionService from "../services/dashboardSessionService.js";
import permissionSyncService from "../services/permissionSyncService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * The dashboard's "server picker" screen — every guild this user can
 * manage AND the bot is actually in. See permissionSyncService for what
 * "can manage" means.
 */
router.get("/", requireAuth, async (req, res) => {
  const accessToken = await dashboardSessionService.getValidAccessToken(
    req.user!.sessionId,
  );

  if (!accessToken) {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  const guilds = await permissionSyncService.getManageableGuilds(
    req.user!.userId,
    accessToken,
  );

  res.json({ guilds });
});

export default router;
