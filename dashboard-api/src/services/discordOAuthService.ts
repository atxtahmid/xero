import axios from "axios";

import config from "../config/index.js";
import logger from "../logger/logger.js";

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface DiscordGuildSummary {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

class DiscordOAuthService {
  /**
   * The URL the dashboard frontend redirects a user to in order to start
   * the Discord OAuth2 login flow.
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.discord.clientId,
      redirect_uri: config.discord.redirectUri,
      response_type: "code",
      scope: "identify guilds",
      state,
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges the one-time authorization code Discord redirects back
   * with for an access token. This is the ONLY step that needs the
   * client secret — never expose that to the frontend.
   */
  async exchangeCode(code: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: config.discord.redirectUri,
    });

    const response = await axios.post<TokenResponse>(
      `${DISCORD_API}/oauth2/token`,
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return response.data;
  }

  async getUser(accessToken: string): Promise<DiscordUser> {
    const response = await axios.get<DiscordUser>(
      `${DISCORD_API}/users/@me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  /**
   * Returns every guild the user is a member of, each with the user's
   * OWN permission bitfield in that guild. This is what Permission Sync
   * is built on — see permissionSyncService.ts, which cross-references
   * this against the Manage Guild bit AND whether the bot is actually in
   * that guild.
   */
  async getUserGuilds(accessToken: string): Promise<DiscordGuildSummary[]> {
    try {
      const response = await axios.get<DiscordGuildSummary[]>(
        `${DISCORD_API}/users/@me/guilds`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      logger.error("[DiscordOAuth] Failed to fetch user guilds:", error);
      return [];
    }
  }
}

export default new DiscordOAuthService();
