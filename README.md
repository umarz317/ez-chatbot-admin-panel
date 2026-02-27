# EzXports Admin Panel

Internal-only React admin UI for viewing chatbot conversations.

## Prerequisites

- Node.js 20+
- Backend running at `http://localhost:5050` (or set `VITE_API_BASE_URL`)
- Backend env var `ADMIN_API_KEY` configured

## Setup

```bash
cd admin-panel
cp .env.example .env
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Auth

Use the same value configured in backend `ADMIN_API_KEY` when signing in.

## Implemented Views

- Login (API key validation)
- Conversations list (pagination, search, email/date filters)
- Conversation detail (full thread + attachments)
