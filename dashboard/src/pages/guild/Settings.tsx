import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api, ApiError } from "../../api/client.js";
import Toggle from "../../components/Toggle.js";
import TextField from "../../components/TextField.js";
import type { GuildSettings } from "../../types/api.js";

const ID_HINT =
  "Paste the Discord ID — right-click the channel or role with Developer Mode on, then Copy ID.";

export default function Settings() {
  const { guildId } = useParams<{ guildId: string }>();
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GuildSettings>(`/api/guilds/${guildId}/settings`)
      .then(setSettings)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          // No settings row yet — start from defaults so the form still works.
          setSettings({
            guildId: guildId!,
            aiEnabled: true,
            searchEnabled: true,
            logChannelId: null,
            serverLogChannelId: null,
            aiLogChannelId: null,
            welcomeChannelId: null,
            welcomeMessage: null,
            leaveMessage: null,
            autoRoleId: null,
            modRoleId: null,
            adminRoleId: null,
            djRoleId: null,
            musicDefaultVolume: 100,
          });
          return;
        }
        setError("Couldn't load settings.");
      });
  }, [guildId]);

  function update<K extends keyof GuildSettings>(key: K, value: GuildSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!settings) return;

    setStatus("saving");

    try {
      const { guildId: _guildId, ...body } = settings;
      const updated = await api.put<GuildSettings>(
        `/api/guilds/${guildId}/settings`,
        body,
      );
      setSettings(updated);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!settings) return <p className="font-mono text-sm text-muted">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted">{ID_HINT}</p>
        </div>
        <button
          onClick={save}
          disabled={status === "saving"}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      {status === "error" && (
        <p className="mb-4 text-sm text-danger">Couldn't save. Try again.</p>
      )}

      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">AI</h2>
          <Toggle
            label="AI chat"
            description="Enable /chat for this server."
            checked={settings.aiEnabled}
            onChange={(v) => update("aiEnabled", v)}
          />
          <Toggle
            label="Web search"
            description="Let AI chat search the web for current information."
            checked={settings.searchEnabled}
            onChange={(v) => update("searchEnabled", v)}
          />
          <TextField
            label="AI usage log channel"
            value={settings.aiLogChannelId ?? ""}
            onChange={(v) => update("aiLogChannelId", v || null)}
            placeholder="Channel ID"
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            Logging
          </h2>
          <TextField
            label="Moderation log channel"
            value={settings.logChannelId ?? ""}
            onChange={(v) => update("logChannelId", v || null)}
            placeholder="Channel ID"
          />
          <TextField
            label="Server activity log channel"
            value={settings.serverLogChannelId ?? ""}
            onChange={(v) => update("serverLogChannelId", v || null)}
            placeholder="Channel ID"
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            Welcome &amp; leave
          </h2>
          <TextField
            label="Welcome/leave channel"
            value={settings.welcomeChannelId ?? ""}
            onChange={(v) => update("welcomeChannelId", v || null)}
            placeholder="Channel ID"
          />
          <TextField
            label="Welcome message"
            value={settings.welcomeMessage ?? ""}
            onChange={(v) => update("welcomeMessage", v || null)}
            placeholder="Welcome {user} to {server}!"
            multiline
          />
          <TextField
            label="Leave message"
            value={settings.leaveMessage ?? ""}
            onChange={(v) => update("leaveMessage", v || null)}
            placeholder="{user} has left {server}."
            multiline
          />
          <TextField
            label="Auto-role"
            value={settings.autoRoleId ?? ""}
            onChange={(v) => update("autoRoleId", v || null)}
            placeholder="Role ID"
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Roles</h2>
          <TextField
            label="Moderator role"
            value={settings.modRoleId ?? ""}
            onChange={(v) => update("modRoleId", v || null)}
            placeholder="Role ID"
          />
          <TextField
            label="Admin role"
            value={settings.adminRoleId ?? ""}
            onChange={(v) => update("adminRoleId", v || null)}
            placeholder="Role ID"
          />
          <TextField
            label="DJ role"
            value={settings.djRoleId ?? ""}
            onChange={(v) => update("djRoleId", v || null)}
            placeholder="Role ID"
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Music</h2>
          <TextField
            label="Default volume (0-150)"
            value={String(settings.musicDefaultVolume)}
            onChange={(v) => {
              const num = Number(v);
              if (!Number.isNaN(num)) update("musicDefaultVolume", num);
            }}
          />
        </section>
      </div>

      <p className="mt-8 text-xs text-muted">
        Note: Anti-Nuke's log channel and the Owner Bypass override aren't editable here —
        those stay restricted to the server owner and Anti-Nuke co-owners via the bot's own
        commands, on purpose.
      </p>
    </div>
  );
}
