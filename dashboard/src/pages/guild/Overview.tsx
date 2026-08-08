import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../api/client.js";
import StatCard from "../../components/StatCard.js";

interface AnalyticsData {
  moderation: { casesInWindow: number; totalWarnings: number };
  tickets: { open: number; total: number };
  giveaways: { totalHosted: number };
}

export default function Overview() {
  const { guildId } = useParams<{ guildId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsData>(`/api/guilds/${guildId}/analytics`)
      .then(setData)
      .catch(() => {});
  }, [guildId]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Overview</h1>
      <p className="mb-8 text-sm text-muted">
        A quick snapshot of what's happening in this server.
      </p>

      {data && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Cases (30d)"
            value={data.moderation.casesInWindow}
            accent="accent"
          />
          <StatCard label="Open tickets" value={data.tickets.open} accent="success" />
          <StatCard label="Total warnings" value={data.moderation.totalWarnings} />
          <StatCard label="Giveaways hosted" value={data.giveaways.totalHosted} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { to: "settings", label: "Settings", desc: "AI, logging, welcome, roles" },
          { to: "moderation", label: "Moderation", desc: "Cases and warnings" },
          { to: "tickets", label: "Tickets", desc: "Panels and open tickets" },
          { to: "giveaways", label: "Giveaways", desc: "Active and past giveaways" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border border-hairline bg-surface p-5 transition hover:border-accent"
          >
            <p className="font-semibold">{item.label}</p>
            <p className="text-sm text-muted">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
