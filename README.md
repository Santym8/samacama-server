# samacama-server

Minimal HTTP server that serves a Satisfactory save file (`latest.sav`) with CORS headers for [satisfactory-calculator.com](https://satisfactory-calculator.com).

## Run locally

```bash
node server.js
# or
PORT=3000 node server.js
```

Test that it works:

```bash
curl -I http://localhost:3000/latest.sav
curl http://localhost:3000/
```

## Deploy on Render.com

| Field | Value |
|---|---|
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Environment** | Node |

### Important: file freshness on Render

`latest.sav` is read directly from the local filesystem on every request — it is **not** cached in memory. However, Render builds a snapshot of the repo at deploy time, so the file on disk reflects the commit at the moment of the last deploy, not subsequent pushes.

**Recommended setup:** Enable **Auto-Deploy** in your Render service settings (Settings → Auto-Deploy → Yes). This way, every `git push` from the cron job on the dedicated server triggers a new Render deploy (~1–2 min build time), and the file is refreshed automatically every 15 minutes.

If auto-deploy is not enabled, you must manually trigger a redeploy in the Render dashboard to pick up a newer save file.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check — returns `OK` |
| GET | `/latest.sav` | Downloads the save file |
| OPTIONS | `*` | CORS preflight — returns 200 empty |

## Final endpoint URL

```
https://<your-service-name>.onrender.com/latest.sav
```
