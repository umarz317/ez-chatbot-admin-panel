# EzXports Admin Panel

Internal React dashboard for support/admin conversation management.

## Prerequisites

- Node.js 20+
- Backend running and reachable from this app
- Backend admin OTP auth configured (`ADMIN_AUTH_SECRET`, `ADMIN_OTP_ALLOWED_EMAILS`, SMTP)

## Local Development

```bash
cd admin-panel
cp .env.example .env
# set VITE_API_BASE_URL for your backend
npm install
npm run dev
```

## Environment Variables

- `VITE_API_BASE_URL`: Backend base URL (for example `https://chatbot.ezxports.com`)
- `VITE_API_TIMEOUT_MS` (optional): API timeout in ms (default `15000`)

## Authentication

- Admin login uses email OTP.
- API calls use short-lived bearer tokens from `/api/admin/auth/verify-otp`.
- Unauthorized API responses (`401`) automatically clear local auth and return to `/login`.

## Production Build

```bash
npm run lint
npm run build
```

Generated output is in `dist/`.

## Production Container (Nginx)

```bash
# Build with your backend URL baked into Vite bundle
docker build \
  --build-arg VITE_API_BASE_URL=https://chatbot.ezxports.com \
  --build-arg VITE_API_TIMEOUT_MS=15000 \
  -t ezxports-admin-panel:latest .

# Run
docker run -d --name ezxports-admin-panel -p 8080:80 ezxports-admin-panel:latest
```

## Security Notes

- Do not commit `.env` files.
- Use HTTPS in production.
- Keep OTP/session TTL settings enforced in backend.
