import type { Track, UnresolvedTrack } from "lavalink-client";

import db from "../../database/prisma.js";
import userService from "./userService.js";

interface SavableTrack {
  encoded: string;
  title: string;
  author: string;
  uri: string | null;
  durationMs: number;
}

// UnresolvedTrack entries (e.g. Spotify links lavalink-client hasn't
// resolved to a playable Track yet) lack `encoded`/`duration` — and even
// on a resolved Track, this library types `encoded` as optional, so a
// `.filter()` type-guard alone doesn't get TS to trust it's a string.
// Building the payload in a plain loop lets TS narrow each field locally
// instead of relying on that.
function toSavableTracks(tracks: (Track | UnresolvedTrack)[]): SavableTrack[] {
  const savable: SavableTrack[] = [];

  for (const track of tracks) {
    const encoded = track.encoded;
    const durationMs = track.info.duration;

    if (typeof encoded !== "string" || typeof durationMs !== "number") continue;

    savable.push({
      encoded,
      title: track.info.title ?? "Unknown title",
      author: track.info.author ?? "Unknown artist",
      uri: track.info.uri ?? null,
      durationMs,
    });
  }

  return savable;
}

class PlaylistService {
  async save(ownerId: string, name: string, tracks: (Track | UnresolvedTrack)[]) {
    await userService.getOrCreate(ownerId);

    const normalizedName = name.trim().slice(0, 90);
    const savableTracks = toSavableTracks(tracks);

    return db.$transaction(async (tx) => {
      const playlist = await tx.playlist.upsert({
        where: { ownerId_name: { ownerId, name: normalizedName } },
        update: {},
        create: { ownerId, name: normalizedName },
      });

      // Replace wholesale — simplest correct behavior for re-saving over
      // an existing playlist name.
      await tx.playlistTrack.deleteMany({ where: { playlistId: playlist.id } });

      await tx.playlistTrack.createMany({
        data: savableTracks.map((track, index) => ({
          playlistId: playlist.id,
          encoded: track.encoded,
          title: track.title,
          author: track.author,
          uri: track.uri,
          durationMs: track.durationMs,
          position: index,
        })),
      });

      return playlist;
    });
  }

  async list(ownerId: string) {
    return db.playlist.findMany({
      where: { ownerId },
      include: { _count: { select: { tracks: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async find(ownerId: string, name: string) {
    return db.playlist.findUnique({
      where: { ownerId_name: { ownerId, name: name.trim().slice(0, 90) } },
      include: { tracks: { orderBy: { position: "asc" } } },
    });
  }

  async delete(ownerId: string, name: string): Promise<boolean> {
    const playlist = await db.playlist.findUnique({
      where: { ownerId_name: { ownerId, name: name.trim().slice(0, 90) } },
      select: { id: true },
    });

    if (!playlist) return false;

    await db.playlist.delete({ where: { id: playlist.id } });

    return true;
  }
}

export default new PlaylistService();
