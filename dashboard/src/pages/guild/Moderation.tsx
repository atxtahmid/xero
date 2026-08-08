import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../../api/client.js";

interface Case {
  id: string;
  userId: string;
  moderatorId: string;
  action: string;
  reason: string;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  BAN: "text-danger",
  KICK: "text-danger",
  SOFT_BAN: "text-warning",
  TEMP_BAN: "text-warning",
  TIMEOUT: "text-warning",
  WARN: "text-warning",
  TIMEOUT_REMOVED: "text-success",
};

export default function Moderation() {
  const { guildId } = useParams<{ guildId: string }>();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ cases: Case[]; totalPages: number }>(
        `/api/guilds/${guildId}/moderation/cases?page=${page}`,
      )
      .then((data) => {
        setCases(data.cases);
        setTotalPages(data.totalPages);
      })
      .catch(() => setError("Couldn't load moderation cases."));
  }, [guildId, page]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Moderation</h1>
      <p className="mb-8 text-sm text-muted">
        Case history for this server. Viewing only — actions still happen through the bot.
      </p>

      {error && <p className="text-danger">{error}</p>}
      {!cases && !error && <p className="font-mono text-sm text-muted">Loading…</p>}

      {cases && cases.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface p-8 text-center text-muted">
          No cases yet.
        </div>
      )}

      {cases && cases.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-hairline last:border-0">
                  <td className={`px-4 py-3 font-mono font-semibold ${ACTION_COLOR[c.action] ?? "text-ink"}`}>
                    {c.action.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">{c.userId}</td>
                  <td className="max-w-xs truncate px-4 py-3">{c.reason}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-hairline px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="font-mono text-xs text-muted">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-hairline px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
