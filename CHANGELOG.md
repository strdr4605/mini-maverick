# Changelog

## 2026-03-23

### Backend WebSocket proxy
- Added `backend/` — Fastify + TypeScript service proxying frontend WS to OpenClaw gateway
- `src/openclaw/protocol.ts` — gateway v3 frame types, type guards, parseFrame
- `src/openclaw/handshake.ts` — challenge-response handshake with token + Ed25519 device auth
- `src/openclaw/device-auth.ts` — Ed25519 keypair gen, v3 payload signing, deviceId = SHA-256(raw pubkey)
- `src/openclaw/client.ts` — OpenClawClient (EventEmitter), auto-reconnect on disconnect
- `src/ws/handler.ts` — translates frontend `{type:message}` ↔ OpenClaw frames, streams deltas back
- `src/ws/types.ts` — typed frontend↔backend WS protocol
- `backend/scripts/test-ws.mjs` — manual test script: connect to backend WS, send a message, print response
- Updated `docker-compose.yml`: added backend service + `openclaw-workspace-init` init container to fix workspace volume permissions (Docker creates named volumes as root; OpenClaw runs as node)
- AI usage: Claude Code implemented all backend files, debugged Ed25519 device ID derivation, diagnosed and fixed workspace volume permission issue

## 2026-03-22

### OpenClaw Docker setup
- Added `docker-compose.yml` with OpenClaw service (ghcr.io/openclaw/openclaw:latest)
- Created `openclaw/openclaw.json` — minimal config: Anthropic provider, gateway bind lan, token auth
- Added `.env.example` with required env vars (ANTHROPIC_API_KEY, OPENCLAW_GATEWAY_TOKEN)
- Added `.gitignore` for .env, node_modules, dist, data/
- AI usage: Claude Code researched OpenClaw Docker image, config format, gateway protocol

## 2026-03-20

### Project setup
- Initialized repo as `mini-maverick`
- Created CHANGELOG.md and docs/decisions.md
- AI usage: Claude Code helped set up initial structure
