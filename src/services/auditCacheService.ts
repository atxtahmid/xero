import { User } from "discord.js";
import { AntiNukeAction } from "../utils/antiNukeActions.js";

interface CacheEntry {
  executor: User;
  expiresAt: number;
}

class AuditCacheService {
  private static readonly DEFAULT_TTL = 10_000;

  private readonly cache = new Map<string, CacheEntry>();

  constructor() {
    const timer = setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 1000 * 60 * 5);

    timer.unref();
  }

  private makeKey(guildId: string, action: AntiNukeAction): string {
    return `${guildId}:${action}`;
  }

  get(guildId: string, action: AntiNukeAction): User | null {
    const key = this.makeKey(guildId, action);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

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
    ttl = AuditCacheService.DEFAULT_TTL,
  ): void {
    const key = this.makeKey(guildId, action);

    this.cache.set(key, {
      executor,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(guildId: string, action: AntiNukeAction): void {
    this.cache.delete(this.makeKey(guildId, action));
  }

  clear(): void {
    this.cache.clear();
  }
}

export default new AuditCacheService();