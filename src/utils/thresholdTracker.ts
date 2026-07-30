type ActionRecord = {
  timestamp: number;
};

class ThresholdTracker {
  private readonly cache = new Map<string, ActionRecord[]>();

  constructor() {
    // Periodic Cleanup: Every 5 minutes, remove empty keys from memory
    setInterval(() => {
      const now = Date.now();
      for (const [key, history] of this.cache.entries()) {
        // If history is older than 30 seconds (standard window), delete key
        if (history.length === 0 || now - history[history.length - 1].timestamp > 30000) {
          this.cache.delete(key);
        }
      }
    }, 1000 * 60 * 5);
  }

  register(
    guildId: string,
    userId: string,
    action: string,
    threshold: number,
    windowMs: number,
  ): boolean {
    const key = `${guildId}:${userId}:${action}`;
    const now = Date.now();

    const history = this.cache.get(key) ?? [];

    // Prune history entries outside of the current window
    const valid = history.filter(
      (entry) => now - entry.timestamp <= windowMs,
    );

    valid.push({ timestamp: now });

    this.cache.set(key, valid);

    return valid.length >= threshold;
  }

  clear(guildId: string, userId: string, action: string): void {
    this.cache.delete(`${guildId}:${userId}:${action}`);
  }
}

export default new ThresholdTracker();