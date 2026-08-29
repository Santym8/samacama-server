# samacama-server

Minimal HTTP server that proxies a Satisfactory save file (`latest.sav`) stored in a
Backblaze B2 bucket, with CORS headers for [satisfactory-calculator.com](https://satisfactory-calculator.com).

## Why B2 instead of committing the save to this repo

Previously, a cron job on the dedicated server committed and pushed a fresh
`latest.sav` to this repo every 15 minutes, which triggered a Render auto-deploy
(full rebuild) each time — dozens of unnecessary rebuilds per day. Now the cron
job uploads the save straight to a Backblaze B2 bucket, and this server fetches
it from B2 on every request instead of reading a file baked into the deploy.
This service only needs to be redeployed when its own code changes.

The B2 bucket has a lifecycle rule that deletes hidden (overwritten) versions
after 1 day, so repeated uploads of `latest.sav` don't grow storage unbounded
while still giving a day of rollback history.

## Environment variables

| Variable | Description |
|---|---|
| `B2_KEY_ID` | Backblaze B2 application key ID (scoped to the save bucket only) |
| `B2_APPLICATION_KEY` | Backblaze B2 application key secret |
| `B2_BUCKET_NAME` | Name of the B2 bucket holding `latest.sav` |
| `PORT` | Port to listen on (Render sets this automatically) |

## Run locally

```bash
B2_KEY_ID=... B2_APPLICATION_KEY=... B2_BUCKET_NAME=... node server.js
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
| **Auto-Deploy** | Not needed anymore — the save no longer lives in this repo, so a push here only happens when the server code itself changes. |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check — returns `OK` |
| GET / HEAD | `/latest.sav` | Streams the save file, proxied from B2 |
| OPTIONS | `*` | CORS preflight — returns 200 empty |

## Final endpoint URL

```
https://<your-service-name>.onrender.com/latest.sav
```
