import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../../api/client.js";

interface Giveaway {
  id: string;
  prize: string;
  hostId: string;
  winnerCount: number;
  endsAt: string;
  ended: boolean;
  winnerIds: string[];
}

export default function Giveaways() {
  const { guildId } = useParams<{ guildId: string }>();
  const [giveaways, setGiveaways] = useState<Giveaway[] | null>(null);
  const [filter, setFilter] = useState<"" | "active" | "ended">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = filter ? `?status=${filter}` : "";
    api
      .get<{ giveaways: Giveaway[] }>(`/api/guilds/${guildId}/giveaways${query}`)
      .then((data) => setGiveaways(data.giveaways))
      .catch(() => setError("Couldn't load giveaways."));
  }, [guildId, filter]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Giveaways</h1>
      <p className="mb-8 text-sm text-muted">
        Viewing only — starting, ending, and rerolling still happen through the bot.
      </p>

      <div className="mb-4 flex gap-2">
        {(["", "active", "ended"] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
              filter === s
                ? "border-accent bg-accent/10 text-accent"
                : "border-hairline text-muted hover:text-ink"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-danger">{error}</p>}
      {!giveaways && !error && <p className="font-mono text-sm text-muted">Loading…</p>}

      {giveaways && giveaways.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface p-8 text-center text-muted">
          No giveaways found.
        </div>
      )}

      {giveaways && giveaways.length > 0 && (
        <div className="space-y-3">
          {giveaways.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-4"
            >
              <div>
                <p className="font-semibold">{g.prize}</p>
                <p className="font-mono text-xs text-muted">
                  {g.winnerCount} winner(s) · hosted by {g.hostId}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-xs font-semibold uppercase ${
                    g.ended ? "text-muted" : "text-success"
                  }`}
                >
                  {g.ended ? "Ended" : "Active"}
                </p>
                <p className="text-xs text-muted">
                  {g.ended
                    ? g.winnerIds.length > 0
                      ? `${g.winnerIds.length} winner(s) drawn`
                      : "No valid entries"
                    : new Date(g.endsAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
