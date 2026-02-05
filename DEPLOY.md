# ANIRIAS – Vercel + Railway Deploy

## Vercel (Frontend)

- **Root**: `frontend/` (Vercel projesinde "Root Directory" = `frontend`)
- **Build**: `npm run build` (Vite → `dist/`)
- **SPA fallback**: `frontend/vercel.json` — tüm path'ler `index.html`'e rewrite (BrowserRouter için `/admin/automation` vb. F5'te 404 vermez)
- **Env**: `VITE_API_BASE_URL` = Railway backend URL (örn. `https://anirias-backend.up.railway.app`)

## Railway (Backend)

- **Root**: `backend/`
- **Start**: `npm run build && npm start` (Express, `PORT` env ile)
- **Health check**: Dashboard'da Health Check Path = `/api/health` (zaten `GET /api/health` var)
- **CORS**: `CORS_ORIGIN` ile sınırlayabilirsin; default’ta `anirias.com`, `anirias.vercel.app` zaten allow list’te
- **Not**: Railway sadece API sunar; frontend statik dosyası serve etmez. SPA fallback sadece Vercel’de gerekli.

## Özet

| Ortam    | Rol      | SPA fallback / Not                    |
|----------|----------|----------------------------------------|
| Vercel   | Frontend | ✅ `frontend/vercel.json` rewrites     |
| Railway  | API      | Gerek yok (sadece `/api/*` endpoint’leri) |
