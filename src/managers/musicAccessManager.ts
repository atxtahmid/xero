const MAX_GRANTED = 2;

type Session = {
  inviterId: string;
  grantedIds: Set<string>;
};

/**
 * Tracks, per guild, who is allowed to control music playback for the
 * *current* voice session — the member who caused the bot to join
 * (`inviterId`), plus up to two more members they've explicitly granted
 * access to (`grantedIds`). Purely in-memory: a fresh session starts each
 * time the bot joins a voice channel from scratch, and it's cleared when
 * the player is destroyed (bot leaves).
 *
 * This is independent of the optional DJ role (see GuildSettings.djRoleId)
 * — a server can use either, or neither (in which case only the inviter/
 * their picks can control music).
 */
class MusicAccessManager {
  private readonly sessions = new Map<string, Session>();

  /**
   * Starts a fresh session for a guild, e.g. when a new player is created.
   * Does nothing if a session already exists (joining doesn't reset an
   * existing session's grants).
   */
  startSession(guildId: string, inviterId: string): void {
    if (this.sessions.has(guildId)) return;

    this.sessions.set(guildId, {
      inviterId,
      grantedIds: new Set(),
    });
  }

  endSession(guildId: string): void {
    this.sessions.delete(guildId);
  }

  getInviter(guildId: string): string | null {
    return this.sessions.get(guildId)?.inviterId ?? null;
  }

  /**
   * Grants access. Only callable conceptually by the inviter (enforced by
   * the caller, not here) — returns false if the 2-slot cap is already
   * full or there's no active session.
   */
  grant(guildId: string, userId: string): boolean {
    const session = this.sessions.get(guildId);

    if (!session) return false;
    if (session.inviterId === userId) return true;
    if (session.grantedIds.has(userId)) return true;

    if (session.grantedIds.size >= MAX_GRANTED) {
      return false;
    }

    session.grantedIds.add(userId);
    return true;
  }

  revoke(guildId: string, userId: string): boolean {
    return this.sessions.get(guildId)?.grantedIds.delete(userId) ?? false;
  }

  hasAccess(guildId: string, userId: string): boolean {
    const session = this.sessions.get(guildId);

    if (!session) return false;

    return session.inviterId === userId || session.grantedIds.has(userId);
  }

  listGranted(guildId: string): string[] {
    return [...(this.sessions.get(guildId)?.grantedIds ?? [])];
  }

  remainingSlots(guildId: string): number {
    const session = this.sessions.get(guildId);

    if (!session) return 0;

    return Math.max(0, MAX_GRANTED - session.grantedIds.size);
  }
}

export default new MusicAccessManager();
