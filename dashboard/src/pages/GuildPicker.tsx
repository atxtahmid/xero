import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import type { ManageableGuild } from "../types/api.js";

function guildIconUrl(guild: ManageableGuild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function GuildPicker() {
  const { user, logout } = useAuth();
  const [guilds, setGuilds] = useState<ManageableGuild[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ guilds: ManageableGuild[] }>("/api/guilds")
      .then((data) => setGuilds(data.guilds))
      .catch(() => setError("Couldn't load your servers. Try refreshing."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            Xero Dashboard
          </div>
          <h1 className="text-2xl font-bold">
            {user ? `Welcome, ${user.username}` : "Your servers"}
          </h1>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-hairline px-4 py-2 text-sm text-muted transition hover:border-danger hover:text-danger"
        >
          Sign out
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {!guilds && !error && (
        <p className="font-mono text-sm text-muted">Loading servers…</p>
      )}

      {guilds && guilds.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface p-8 text-center">
          <p className="mb-2 font-semibold">No manageable servers found</p>
          <p className="text-sm text-muted">
            You need Manage Server permission on a server where Xero is already added.
          </p>
        </div>
      )}

      {guilds && guilds.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {guilds.map((guild) => {
            const iconUrl = guildIconUrl(guild);

            return (
              <Link
                key={guild.id}
                to={`/guild/${guild.id}`}
                className="flex items-center gap-4 rounded-xl border border-hairline bg-surface p-4 transition hover:border-accent"
              >
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-hairline font-mono text-sm font-semibold text-muted">
                    {initials(guild.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{guild.name}</p>
                  {guild.owner && (
                    <p className="font-mono text-xs uppercase tracking-wide text-accent">
                      Owner
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
