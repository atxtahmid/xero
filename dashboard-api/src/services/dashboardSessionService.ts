import axios from "axios";

import config from "../config/index.js";
import db from "../database/prisma.js";
import logger from "../logger/logger.js";

const DISCORD_TOKEN_URL = "https://discord.com/api/v10/oauth2/token";

// Refresh a bit before actual expiry, so a request never races against
// a token that's technically still valid but expires mid-flight.
const REFRESH_MARGIN_MS = 60_000;

class DashboardSessionService {
  async create(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresInSeconds: number,
  ) {
    return db.dashboardSession.create({
      data: {
        userId,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      },
    });
  }

  async findById(sessionId: string) {
    return db.dashboardSession.findUnique({
      where: {
        id: sessionId,
      },
    });
  }

  async deleteById(sessionId: string): Promise<void> {
    await db.dashboardSession.delete({
      where: {
        id: sessionId,
      },
    }).catch(() => {});
  }

  /**
   * Returns a valid, live Discord access token for this session,
   * transparently refreshing it via Discord's refresh_token grant if
   * it's expired (or about to). Every route that needs to call Discord's
   * API on the user's behalf (Permission Sync, guild list) should go
   * through this rather than reading `session.accessToken` directly.
   */
  async getValidAccessToken(sessionId: string): Promise<string | null> {
    const session = await this.findById(sessionId);

    if (!session) return null;

    if (session.expiresAt.getTime() - REFRESH_MARGIN_MS > Date.now()) {
      return session.accessToken;
    }

    try {
      const body = new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      });

      const response = await axios.post(DISCORD_TOKEN_URL, body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      await db.dashboardSession.update({
        where: {
          id: sessionId,
        },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        },
      });

      return access_token;
    } catch (error) {
      logger.error(
        `[DashboardSession] Failed to refresh token for session ${sessionId}:`,
        error,
      );

      // Refresh token itself is likely dead (revoked/expired) — clean up
      // so the user gets a clean "please log in again" instead of
      // silently reusing a dead session forever.
      await this.deleteById(sessionId);

      return null;
    }
  }
}

export default new DashboardSessionService();
