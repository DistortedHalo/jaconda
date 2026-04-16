# DUBSYNC merged Round2 full-stack

This package merges:
- the **Round2** visual frontend direction
- the **Jaconda** full-stack functionality (tracks API, site-content API, brief submission, admin)

## Structure
- `backend/` Express + SQLite + uploads + admin
- `frontend/` React + Vite + Tailwind

## Local development

### Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:4000`

### Frontend
```bash
cd frontend
npm install
npm run start
```
Frontend runs on Vite and proxies `/api` and `/uploads` to `http://localhost:4000` by default.

## Production notes
- Set `PUBLIC_BASE_URL` in the backend if uploads need absolute public URLs.
- Optional: set `VITE_API_PROXY_TARGET` when running the frontend against a remote backend during dev.

## Admin
Open:
- `http://localhost:4000/admin`
