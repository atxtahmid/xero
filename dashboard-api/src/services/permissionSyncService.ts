import db from "../database/prisma.js";
import config from "../config/index.js";
import discordOAuthService, {
  type DiscordGuildSummary,
} from "./discordOAuthService.js";

// Discord permission bit for "Manage Server" — see Discord's
// documentation on permission flags. Using the raw bit directly rather
// than pulling in discord.js just for this one constant, since this
// service otherwise has no reason to depend on discord.js at all (it
// never touches the gateway, only Discord's plain REST API).
const MANAGE_GUILD_BIT = 0x0000000000000020n;

export interface ManageableGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

class PermissionSyncService {
  private hasManageGuild(permissions: string): boolean {
    try {
      return (BigInt(permissions) & MANAGE_GUILD_BIT) === MANAGE_GUILD_BIT;
    } catch {
      return false;
    }
  }

  /**
   * Returns every guild this user is allowed to manage on the
   * dashboard: they must have Manage Server (or be the guild owner) on
   * the Discord side, AND the bot must actually be in that guild —
   * otherwise there's nothing here to manage regardless of their
   * Discord permissions.
   */
  async getManageableGuilds(
    userId: string,
    accessToken: string,
  ): Promise<ManageableGuild[]> {
    const discordGuilds = await discordOAuthService.getUserGuilds(accessToken);

    const eligible = discordGuilds.filter(
      (guild) => guild.owner || this.hasManageGuild(guild.permissions),
    );

    if (eligible.length === 0) {
      return [];
    }

    const botGuildIds = await db.guild.findMany({
      where: {
        id: {
          in: eligible.map((guild) => guild.id),
        },
      },
      select: {
        id: true,
      },
    });

    const botGuildIdSet = new Set(botGuildIds.map((guild) => guild.id));

    return eligible
      .filter((guild) => botGuildIdSet.has(guild.id))
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
      }));
  }

  /**
   * Re-checks a SINGLE guild — used by route middleware on every
   * settings/moderation request, not just the guild list screen. A
   * cached "can manage" flag from login time could go stale (someone's
   * role gets removed mid-session); this re-verifies against Discord
   * every time instead of trusting a stored value.
   */
  async canManageGuild(
    userId: string,
    accessToken: string,
    guildId: string,
  ): Promise<boolean> {
    // The bot's own global owner can manage every guild the bot is in,
    // mirroring the bot's own trust model (see utils/ownerTrust.ts on
    // the bot side) — same reasoning: this is the root of trust, not
    // something Discord's permission bits need to confirm.
    if (userId === config.owner.id) {
      const guild = await db.guild.findUnique({
        where: {
          id: guildId,
        },
        select: {
          id: true,
        },
      });

      return guild !== null;
    }

    const manageable = await this.getManageableGuilds(userId, accessToken);

    return manageable.some((guild) => guild.id === guildId);
  }
}

export default new PermissionSyncService();
