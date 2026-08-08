# Xero Dashboard

Frontend for `dashboard-api`. Vite + React + TypeScript + Tailwind, deployed
as a static site (no server needed for this part).

## Local development

```
npm install
cp .env.example .env
# edit .env if your dashboard-api isn't at the default URL
npm run dev
```

## Deploying to Vercel

1. Import this repo into Vercel, set the **Root Directory** to `dashboard`
   (same idea as Root Directory on Railway for the other two services).
2. Framework preset: Vite (Vercel should auto-detect this).
3. Add an environment variable: `VITE_API_URL` = your deployed
   `dashboard-api` URL (e.g. `https://xero-dashboard-api-production.up.railway.app`).
4. Deploy. Once it's live, go to Project Settings → Domains and add your
   custom domain there — Vercel will show you the DNS record to add.
5. Once the domain is live, set `FRONTEND_URL` on the `dashboard-api`
   Railway service to that same domain, and update `CORS_ORIGINS` there
   too if it isn't already set to it.

`vercel.json` in this folder handles client-side routing (so refreshing
`/guild/123/settings` doesn't 404) — Vercel picks it up automatically,
nothing to configure.
