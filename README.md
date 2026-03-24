# mini-maverick

Chat app connecting to [OpenClaw](https://openclaw.ai) via WebSocket gateway. Built as a technical assessment for Maverick.

## Stack

- **OpenClaw** — AI agent runtime (Docker)
- **Backend** — Fastify + TypeScript, WebSocket proxy between frontend and OpenClaw gateway
- **Frontend** — React + Vite + TanStack Query + Tailwind CSS (Gruvbox light)

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- An [Anthropic API key](https://console.anthropic.com/)

---

## Setup

### 1. Clone and configure environment

```bash
git clone https://github.com/strdr4605/mini-maverick.git
cd mini-maverick
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Required: Anthropic API key for OpenClaw to use Claude
ANTHROPIC_API_KEY=sk-ant-...

# Required: secret token securing the OpenClaw gateway WebSocket
# Choose any strong random string — backend and OpenClaw must match
OPENCLAW_GATEWAY_TOKEN=my-secret-gateway-token
```

### 2. Start the stack

```bash
docker compose up --build
```

This starts three services:
- `openclaw` — AI agent runtime on port 18789
- `backend` — Fastify WS proxy on port 3001 (shares OpenClaw's network)
- `frontend` — React app via nginx on port 8080

### 3. Approve the device (first run only)

The backend authenticates to OpenClaw using an Ed25519 keypair. On first run, you must approve it manually.

Wait for OpenClaw to be healthy (watch for `[backend] connected to OpenClaw gateway` in logs), then:

```bash
# List pending device requests
docker exec mini-maverick-openclaw-1 node openclaw.mjs devices list

# Approve the device using the id shown in the list
docker exec mini-maverick-openclaw-1 node openclaw.mjs devices approve <id>
```

The device keypair is persisted to `./data/device-key.json`. Subsequent restarts reconnect automatically without re-approval.

### 4. Open the app

```bash
open http://localhost:8080
```

---

## Development (without Docker)

Run backend and frontend individually for faster iteration.

### Backend

```bash
cd backend
npm install
# set env vars
export OPENCLAW_WS_URL=ws://localhost:18789
export OPENCLAW_AUTH_TOKEN=my-secret-gateway-token
export DATA_DIR=./data
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:3001`.

> OpenClaw must still be running in Docker for the backend to connect.

---

## Architecture

```
Browser
  │  WebSocket (simple protocol)
  ▼
Backend (Fastify)
  │  OpenClaw gateway protocol v3
  │  (challenge-response handshake, Ed25519 device auth, JSON frames)
  ▼
OpenClaw
  │  Anthropic API
  ▼
Claude
```

The backend acts as a protocol translator. The frontend speaks a simple `message → delta → done` protocol; the backend handles the full OpenClaw gateway handshake, session management, and streaming.

---

## Troubleshooting

**`[backend] OpenClaw not available, will retry`** — OpenClaw is still starting. Wait ~20s for it to become healthy. The backend retries every 3s automatically.

**Frontend shows "disconnected"** — Backend WebSocket not reachable. Check `docker compose ps` and backend logs.

**Device approval required again** — The `./data/device-key.json` was deleted or the `./data` volume was reset. Re-run the approval step.

**`EACCES` errors in OpenClaw logs** — Workspace volume permissions issue. Run:
```bash
docker compose down -v && docker compose up --build
```
The init container (`openclaw-workspace-init`) fixes ownership on startup.
