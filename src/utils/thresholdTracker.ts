type ActionRecord = {
  timestamp: number;
};

const CLEANUP_INTERVAL = 5 * 60 * 1000;
const DEFAULT_WINDOW = 30_000;

class ThresholdTracker {
  private readonly cache = new Map<
    string,
    ActionRecord[]
  >();

  constructor() {
    const timer = setInterval(() => {
      const now = Date.now();

      for (const [key, history] of this.cache.entries()) {
        if (
          history.length === 0 ||
          now - history[history.length - 1].timestamp >
            DEFAULT_WINDOW
        ) {
          this.cache.delete(key);
        }
      }
    }, CLEANUP_INTERVAL);

    timer.unref();
  }

  private makeKey(
    guildId: string,
    userId: string,
    action: string,
  ): string {
    return `${guildId}:${userId}:${action}`;
  }

  register(
    guildId: string,
    userId: string,
    action: string,
    threshold: number,
    windowMs: number,
  ): boolean {
    const key = this.makeKey(
      guildId,
      userId,
      action,
    );

    const now = Date.now();

    const history = this.cache.get(key) ?? [];

    const valid = history.filter(
      (entry) =>
        now - entry.timestamp <= windowMs,
    );

    valid.push({
      timestamp: now,
    });

    this.cache.set(key, valid);

    return valid.length >= threshold;
  }

  clear(
    guildId: string,
    userId: string,
    action: string,
  ): void {
    this.cache.delete(
      this.makeKey(
        guildId,
        userId,
        action,
      ),
    );
  }
}

export default new ThresholdTracker();