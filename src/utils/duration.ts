const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * Parses simple compound duration strings like "1h30m", "45s", "2d", "1w".
 * Returns milliseconds, or null if the string doesn't parse to anything
 * meaningful. No external dependency — this project didn't already have
 * one (e.g. `ms`), and the format needed here is small enough not to
 * justify adding one.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) return null;

  const matches = [...trimmed.matchAll(/(\d+)\s*(s|m|h|d|w)/g)];

  if (matches.length === 0) return null;

  let totalMs = 0;

  for (const match of matches) {
    const value = Number(match[1]);
    const unit = match[2];

    totalMs += value * UNIT_MS[unit];
  }

  return totalMs > 0 ? totalMs : null;
}

export function formatDuration(ms: number): string {
  const days = Math.floor(ms / UNIT_MS.d);
  const hours = Math.floor((ms % UNIT_MS.d) / UNIT_MS.h);
  const minutes = Math.floor((ms % UNIT_MS.h) / UNIT_MS.m);
  const seconds = Math.floor((ms % UNIT_MS.m) / UNIT_MS.s);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);

  return parts.length > 0 ? parts.join(" ") : "0s";
}
