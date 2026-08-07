import { NextFunction, Request, Response } from "express";

import jwtService from "../services/jwtService.js";
import permissionSyncService from "../services/permissionSyncService.js";
import dashboardSessionService from "../services/dashboardSessionService.js";

/**
 * Verifies the JWT on every protected request and attaches the decoded
 * payload to `req.user`. Does NOT check guild-level permissions — that's
 * requireGuildAccess below, kept separate since not every authenticated
 * route is guild-scoped (e.g. "list my manageable guilds" needs a user,
 * not a specific guild).
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Missing or invalid Authorization header.",
    });
    return;
  }

  const token = header.slice("Bearer ".length);
  const payload = jwtService.verify(token);

  if (!payload) {
    res.status(401).json({
      error: "Invalid or expired token.",
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Chained after requireAuth on any route with a `:guildId` param — re-
 * verifies (via Permission Sync) that the authenticated user can
 * actually manage THIS guild specifically, not just that they're logged
 * in. This is what stops User A from editing Guild B's settings just by
 * changing the URL.
 */
export async function requireGuildAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: "Not authenticated.",
    });
    return;
  }

  const { guildId } = req.params;

  if (!guildId) {
    res.status(400).json({
      error: "Missing guildId parameter.",
    });
    return;
  }

  const accessToken = await dashboardSessionService.getValidAccessToken(
    req.user.sessionId,
  );

  if (!accessToken) {
    res.status(401).json({
      error: "Session expired. Please log in again.",
    });
    return;
  }

  const canManage = await permissionSyncService.canManageGuild(
    req.user.userId,
    accessToken,
    guildId,
  );

  if (!canManage) {
    res.status(403).json({
      error: "You don't have permission to manage this server.",
    });
    return;
  }

  next();
}
