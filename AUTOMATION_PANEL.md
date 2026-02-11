# Admin Automation Panel

## Route
`/admin/automation` — Job list, live logs, actions, paused resolver.

## Required Env (Backend)
```
AUTOMATION_BASE_URL=http://168.119.233.175:3190   # Automation server
AUTOMATION_API_KEY=your-api-key                   # Optional, sent as X-API-KEY
```

## How it works
- Frontend calls ANIRIAS backend at `/api/automation-proxy/*`
- Backend proxies to `AUTOMATION_BASE_URL` and injects `X-API-KEY` (server-side only)
- API key is never exposed to the browser
- Live logs: SSE stream via `GET /api/logs/stream?jobId=...` with auto-reconnect and backoff
- Jobs: `GET /api/jobs`, job detail drawer with payload, logs, Run/Resume/Cancel
- Actions: Scan Missing, Import Missing, Metadata Patch, Watch New Start/Stop, Add Anime, Manual Import

## Episodes page
Bölüm sayfasında "Open Automation" butonu `/admin/automation` sayfasına yönlendirir.
