import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../../api/client.js";

interface TicketPanel {
  id: string;
  name: string;
  channelId: string;
  _count: { tickets: number };
}

interface Ticket {
  id: string;
  channelId: string;
  creatorId: string;
  claimedById: string | null;
  status: "OPEN" | "LOCKED" | "CLOSED";
  createdAt: string;
  panel: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: "text-success",
  LOCKED: "text-warning",
  CLOSED: "text-muted",
};

export default function Tickets() {
  const { guildId } = useParams<{ guildId: string }>();
  const [panels, setPanels] = useState<TicketPanel[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ panels: TicketPanel[] }>(`/api/guilds/${guildId}/ticket-panels`)
      .then((data) => setPanels(data.panels))
      .catch(() => setError("Couldn't load ticket panels."));
  }, [guildId]);

  useEffect(() => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    api
      .get<{ tickets: Ticket[] }>(`/api/guilds/${guildId}/tickets${query}`)
      .then((data) => setTickets(data.tickets))
      .catch(() => setError("Couldn't load tickets."));
  }, [guildId, statusFilter]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Tickets</h1>
      <p className="mb-8 text-sm text-muted">
        Viewing only — claim, lock, and close still happen through the bot.
      </p>

      {error && <p className="mb-4 text-danger">{error}</p>}

      {panels && panels.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
            Panels
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className="rounded-xl border border-hairline bg-surface p-4"
              >
                <p className="font-semibold">{panel.name}</p>
                <p className="font-mono text-xs text-muted">
                  {panel._count.tickets} ticket(s)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {["", "OPEN", "LOCKED", "CLOSED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              statusFilter === s
                ? "border-accent bg-accent/10 text-accent"
                : "border-hairline text-muted hover:text-ink"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {tickets && tickets.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface p-8 text-center text-muted">
          No tickets found.
        </div>
      )}

      {tickets && tickets.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Panel</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Claimed by</th>
                <th className="px-4 py-3">Opened</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-hairline last:border-0">
                  <td className={`px-4 py-3 font-mono font-semibold ${STATUS_COLOR[t.status]}`}>
                    {t.status}
                  </td>
                  <td className="px-4 py-3">{t.panel.name}</td>
                  <td className="px-4 py-3 font-mono text-muted">{t.creatorId}</td>
                  <td className="px-4 py-3 font-mono text-muted">
                    {t.claimedById ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
