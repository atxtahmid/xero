import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import type { ManageableGuild } from "../types/api.js";

const NAV_ITEMS = [
  { to: "", label: "Overview", end: true },
  { to: "settings", label: "Settings" },
  { to: "moderation", label: "Moderation" },
  { to: "tickets", label: "Tickets" },
  { to: "giveaways", label: "Giveaways" },
  { to: "analytics", label: "Analytics" },
];

export default function Layout() {
  const { guildId } = useParams<{ guildId: string }>();
  const { logout } = useAuth();
  const [guild, setGuild] = useState<ManageableGuild | null>(null);

  useEffect(() => {
    api
      .get<{ guilds: ManageableGuild[] }>("/api/guilds")
      .then((data) => {
        setGuild(data.guilds.find((g) => g.id === guildId) ?? null);
      })
      .catch(() => setGuild(null));
  }, [guildId]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-hairline bg-surface">
        <div className="border-b border-hairline p-5">
          <NavLink
            to="/guilds"
            className="mb-3 block font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
          >
            ← All servers
          </NavLink>
          <p className="truncate font-semibold">
            {guild?.name ?? "Loading…"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="status-dot absolute inline-flex h-2 w-2 rounded-full bg-success text-success" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Live
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={`/guild/${guildId}${item.to ? `/${item.to}` : ""}`}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-hairline/50 hover:text-ink"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline p-3">
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-hairline/50 hover:text-danger"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
