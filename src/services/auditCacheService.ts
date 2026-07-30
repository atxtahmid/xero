import { User } from "discord.js";
import { AntiNukeAction } from "../utils/antiNukeActions.js";

interface CacheEntry {
  executor: User;
  expiresAt: number;
}

class AuditCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor() {
    // Cleanup Interval: Every 5 minutes, wipe expired entries to prevent memory stagnation
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 1000 * 60 * 5);
  }

  private makeKey(guildId: string, action: AntiNukeAction): string {
    return `${guildId}:${action}`;
  }

  get(guildId: string, action: AntiNukeAction): User | null {
    const key = this.makeKey(guildId, action);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.executor;
  }

  set(
    guildId: string,
    action: AntiNukeAction,
    executor: User,
    ttl = 10_000, // Increased to 10s for production reliability
  ): void {
    const key = this.makeKey(guildId, action);
    this.cache.set(key, {
      executor,
      expiresAt: Date.now() + ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export default new AuditCacheService();