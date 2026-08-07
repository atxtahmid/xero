import { randomBytes } from "node:crypto";

import { Router } from "express";

import config from "../config/index.js";
import dashboardSessionService from "../services/dashboardSessionService.js";
import discordOAuthService from "../services/discordOAuthService.js";
import jwtService from "../services/jwtService.js";
import logger from "../logger/logger.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const STATE_COOKIE = "oauth_state";

/**
 * Step 1 — send the user to Discord's login screen. `state` is a random
 * value stored in a short-lived cookie and checked again on callback, so
 * a third party can't trick a logged-in browser into completing an OAuth
 * flow they didn't start (CSRF on the login flow itself).
 */
router.get("/discord/login", (req, res) => {
  const state = randomBytes(16).toString("hex");

  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });

  res.redirect(discordOAuthService.getAuthorizationUrl(state));
});

/**
 * Step 2 — Discord redirects back here with a one-time code. No
 * frontend exists yet (this is the API-only pass), so this returns the
 * issued JWT as JSON rather than redirecting somewhere with it attached
 * — once a real dashboard frontend exists, swap the final response here
 * for a redirect to it with the token attached.
 */
router.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;

  const expectedState = req.cookies?.[STATE_COOKIE];

  res.clearCookie(STATE_COOKIE);

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code." });
    return;
  }

  if (!state || state !== expectedState) {
    res.status(400).json({ error: "Invalid or missing state — possible CSRF attempt, please try logging in again." });
    return;
  }

  try {
    const tokens = await discordOAuthService.exchangeCode(code);
    const user = await discordOAuthService.getUser(tokens.access_token);

    const session = await dashboardSessionService.create(
      user.id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
    );

    const token = jwtService.sign({
      userId: user.id,
      sessionId: session.id,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("[Auth] OAuth callback failed:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const accessToken = await dashboardSessionService.getValidAccessToken(
    req.user!.sessionId,
  );

  if (!accessToken) {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  const user = await discordOAuthService.getUser(accessToken);

  res.json({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
  });
});

router.post("/logout", requireAuth, async (req, res) => {
  await dashboardSessionService.deleteById(req.user!.sessionId);
  res.json({ success: true });
});

export default router;
