import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../../api/client.js";
import StatCard from "../../components/StatCard.js";

interface AnalyticsData {
  windowDays: number;
  moderation: {
    totalCases: number;
    casesInWindow: number;
    casesByAction: Record<string, number>;
    totalWarnings: number;
    warningsInWindow: number;
  };
  tickets: {
    total: number;
    open: number;
    closed: number;
    averageResolutionMs: number | null;
  };
  giveaways: {
    totalHosted: number;
    totalEnded: number;
    totalWinnersDrawn: number;
  };
}

function formatResolutionTime(ms: number | null): string {
  if (ms === null) return "—";
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function Analytics() {
  const { guildId } = useParams<{ guildId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsData>(`/api/guilds/${guildId}/analytics`)
      .then(setData)
      .catch(() => setError("Couldn't load analytics."));
  }, [guildId]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="font-mono text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Analytics</h1>
      <p className="mb-8 text-sm text-muted">
        Last {data.windowDays} days, plus all-time totals.
      </p>

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Moderation
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total cases" value={data.moderation.totalCases} />
        <StatCard
          label={`Cases (${data.windowDays}d)`}
          value={data.moderation.casesInWindow}
          accent="accent"
        />
        <StatCard label="Total warnings" value={data.moderation.totalWarnings} />
        <StatCard
          label={`Warnings (${data.windowDays}d)`}
          value={data.moderation.warningsInWindow}
        />
      </div>

      {Object.keys(data.moderation.casesByAction).length > 0 && (
        <div className="mb-8 rounded-xl border border-hairline bg-surface p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
            Cases by action
          </p>
          <div className="space-y-2">
            {Object.entries(data.moderation.casesByAction).map(([action, count]) => (
              <div key={action} className="flex items-center justify-between text-sm">
                <span className="text-muted">{action.replace(/_/g, " ")}</span>
                <span className="font-mono font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Tickets
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={data.tickets.total} />
        <StatCard label="Open" value={data.tickets.open} accent="success" />
        <StatCard label="Closed" value={data.tickets.closed} />
        <StatCard
          label="Avg. resolution"
          value={formatResolutionTime(data.tickets.averageResolutionMs)}
        />
      </div>

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Giveaways
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Hosted" value={data.giveaways.totalHosted} />
        <StatCard label="Ended" value={data.giveaways.totalEnded} />
        <StatCard label="Winners drawn" value={data.giveaways.totalWinnersDrawn} />
      </div>
    </div>
  );
}
