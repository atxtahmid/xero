interface ExecutorEntry {
  executorId: string;
  timestamp: number;
}

/**
 * Tracks DISTINCT executors triggering Anti-Nuke per guild, within a
 * sliding time window — this is separate from `thresholdTracker.ts`,
 * which tracks a single user's repeated actions. This one exists purely
 * to detect a coordinated, multi-attacker situation (Lockdown Trigger A):
 * several different accounts each individually crossing their own
 * Anti-Nuke threshold within a short window.
 */
class LockdownTracker {
  private guildExecutors = new Map<string, ExecutorEntry[]>();

  /**
   * Registers that `executorId` just triggered Anti-Nuke in `guildId`,
   * and returns how many DISTINCT executors have triggered Anti-Nuke in
   * this guild within the last `windowMs`.
   */
  registerAndCount(
    guildId: string,
    executorId: string,
    windowMs: number,
  ): number {
    const now = Date.now();

    const existing = this.guildExecutors.get(guildId) ?? [];

    // Drop stale entries, and drop any existing entry for this exact
    // executor (it gets refreshed below) so a single repeat attacker
    // can't inflate the distinct count by re-triggering rapidly.
    const fresh = existing.filter(
      (entry) =>
        now - entry.timestamp < windowMs &&
        entry.executorId !== executorId,
    );

    fresh.push({ executorId, timestamp: now });

    this.guildExecutors.set(guildId, fresh);

    return new Set(fresh.map((entry) => entry.executorId)).size;
  }

  clear(guildId: string): void {
    this.guildExecutors.delete(guildId);
  }
}

export default new LockdownTracker();