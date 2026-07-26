type ActionRecord = {
  timestamp: number;
};

class ThresholdTracker {
  private readonly cache = new Map<
    string,
    ActionRecord[]
  >();

  register(
    guildId: string,
    userId: string,
    action: string,
    threshold: number,
    windowMs: number,
  ): boolean {
    const key = `${guildId}:${userId}:${action}`;

    const now = Date.now();

    const history =
      this.cache.get(key) ?? [];

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
      `${guildId}:${userId}:${action}`,
    );
  }
}

export default new ThresholdTracker();