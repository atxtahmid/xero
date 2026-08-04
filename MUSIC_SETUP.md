# Music Setup — Lavalink on Railway

Lavalink is a separate Java process, not something that runs inside your Node
bot service. You need **two Railway services from the same repo**: the bot
(already there) and a new one for Lavalink, built from `bot/lavalink/`.

## 1. Create the Lavalink service

In your Railway project:

1. **New Service → Deploy from GitHub repo** → pick the same `xero` repo.
2. Once created, go to its **Settings**:
   - **Root Directory**: `bot/lavalink`
   - Railway will detect the `Dockerfile` there and build from it automatically.
3. Go to its **Variables** tab and add:
   - `LAVALINK_SERVER_PASSWORD` — make up a long random string (e.g. `openssl rand -hex 24` locally, or any password generator). This is **not** your bot token — it's just the password the bot uses to authenticate to this Lavalink node.
4. Go to **Settings → Networking** and click **Generate Domain** to expose the service publicly (Railway serves it over HTTPS on port 443, proxied to the container's `2333`).

You don't need to set `PORT` — Railway injects it automatically and the
Dockerfile picks it up as `SERVER_PORT` for `application.yml`.

## 2. Point the bot at it

Back in the **bot** service's Variables (or your local `.env` if running via
Tailscale/tmux against a remote DB), set:

```
LAVALINK_HOST=<the-domain-railway-generated-for-the-lavalink-service>
LAVALINK_PORT=443
LAVALINK_PASSWORD=<the same LAVALINK_SERVER_PASSWORD you set above>
LAVALINK_SECURE=true
```

`LAVALINK_HOST` is just the hostname — no `https://`, no path. Something like
`xero-lavalink-production.up.railway.app`.

If you ever run Lavalink and the bot as **one Railway project with private
networking** instead, you can use the internal hostname (`<service>.railway.internal`)
and port `2333` instead, with `LAVALINK_SECURE=false` — slightly faster, no public
exposure of the node. Public HTTPS is simpler to set up first, though, so start there.

## 3. Deploy order

1. Push/deploy the Lavalink service first and check its logs — you should see
   `Lavalink is ready to accept connections.` Look out for the YouTube plugin
   loading (`Loaded plugin 'youtube-plugin'`); if that line is missing, the
   plugin failed to download and YouTube playback won't work — check the
   service has outbound internet access and the version pinned in
   `application.yml` still exists at that URL.
2. Redeploy the bot service with the env vars from step 2. On boot you should
   see `[Lavalink] Node "main" connected.` in the bot's logs. If instead you
   see repeated `disconnect`/`error` lines, double check the password matches
   exactly and that `LAVALINK_PORT`/`LAVALINK_SECURE` match how you exposed
   the service (443+secure for the public Railway domain).

## 4. What's already wired up in the bot

- `src/services/music/lavalinkManager.ts` reads `LAVALINK_HOST/PORT/PASSWORD/SECURE`
  from `config/index.ts` and connects on `ClientReady`.
- `src/events/client/raw.ts` forwards Discord voice gateway packets to it.
- Commands: `/music-play`, `/music-skip`, `/music-stop`, `/music-leave`,
  `/music-pause`, `/music-resume`, `/music-queue`, `/music-nowplaying`,
  `/music-volume`, `/music-loop`, `/music-shuffle`, `/music-remove`,
  `/music-clear`, `/music-seek`, `/music-filters`, `/music-playlist`,
  `/music-access`, `/settings-djrole`.
- Run `npm run deploy` (or let `npm start` do it, per `package.json`) after
  pulling this update so Discord picks up the new slash commands.
- Run `npx prisma migrate dev` (locally) or make sure your deploy step runs
  `prisma db push`/`migrate deploy` — the schema now has `djRoleId`,
  `musicDefaultVolume`, `Playlist`, and `PlaylistTrack`.

## 5. Costs & scaling note

Lavalink itself is lightweight (idles well under Railway's free-tier RAM
limits), but it does count as a second always-on service, so factor that into
your Railway usage/billing. If you outgrow one node (lots of concurrent
guilds playing audio), `lavalinkManager.ts`'s `nodes` array takes more than
one entry — you'd add a second Lavalink service the same way and list both.

## 6. Public Lavalink nodes (testing only)

There are free public Lavalink nodes floating around Discord bot-dev servers
for quick testing. I'm not going to recommend a specific one here — they
come and go, ownership/logging practices vary, and you said you want this
production-ready, so a node you don't control isn't a good fit to depend on
long-term. The self-hosted setup above is the one to actually ship with.
