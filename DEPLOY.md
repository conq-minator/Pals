# Deploying PALS

PALS runs as **one Node server** (GLY + ARB + DEFENDER + PULSE + the React app) that keeps
WebSocket connections open and holds payments in memory. It needs an always-on server host,
not a serverless one (Vercel and Netlify functions can't hold WebSockets or in-memory state).

The repo has a `Dockerfile` (works on any Docker host) and a `render.yaml` for Render.

## Render (recommended): auto-deploys on every push to `main`

1. Sign in at https://render.com with GitHub and allow it to read this repo.
2. **New > Blueprint**, pick this repo. Render reads `render.yaml` and creates the `pals` web service.
3. Render asks for the secret values. Fill in at least `GEMINI_API_KEY`. Add `PAYPAL_CLIENT_ID`
   and `PAYPAL_CLIENT_SECRET` (sandbox) for payments, `SERPER_API_KEY` / `BRIGHTDATA_*` for live
   product search. Leave any you don't have empty.
4. Wait for the first build (about 5 to 10 minutes: install, build the app, fetch PayPal docs,
   embed them). The site is then live at `https://pals-xxxx.onrender.com`.
5. In the PayPal developer dashboard (sandbox app), nothing else is needed: PALS sends PayPal
   its return address, which Render provides automatically (`RENDER_EXTERNAL_URL`).

From then on, **every push to `main` rebuilds and redeploys the site**. Render keeps the old
version running until the new one passes its health check (`/healthz`), so a broken build
never takes the site down.

**Plan:** `render.yaml` uses Starter (about $7/month). The server uses about 300 MB at idle, so
the free plan (512 MB) may work, but it sleeps after 15 idle minutes and the first visit then
takes about a minute. To try free, change `plan: starter` to `plan: free`.

## Other hosts

- **Railway**: New Project > Deploy from GitHub repo. It finds the `Dockerfile`, sets `PORT`,
  and redeploys on push. Add the same variables, plus `PALS_PUBLIC_URL=https://<your-domain>`.
- **Fly.io**: `fly launch` (uses the `Dockerfile`), `fly secrets set GEMINI_API_KEY=...`, then
  `fly deploy`. For deploy-on-push, add Fly's GitHub Action.
- **Any VPS**: `docker build -t pals . && docker run -p 80:8787 --env-file .env pals`.

On hosts other than Render, set `PALS_PUBLIC_URL` to the site's public `https://` address:
PayPal sends buyers back there after they pay.

## What the build does

1. Installs dependencies for the server, GLY and the frontend.
2. Builds the React app into `frontend/dist`.
3. Fetches GLY's knowledge base: developer.paypal.com guides and PayPal's Privacy Statement.
   (www.paypal.com help pages block servers; run `npm run knowledge` on a normal computer to
   get them locally.)
4. Embeds everything once, so each start takes seconds.

## Things to know

- **Restarts lose in-memory state**: chats in progress, offers and unfinished payments. Each
  deploy is a restart, so avoid pushing to `main` during a live demo.
- **Gemini free tier** allows 20 requests per model per day, a few chat messages. Turn on
  billing for the Google project before a demo.
- Never commit `.env`. Secrets live only in the host's settings.
