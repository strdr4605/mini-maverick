# Architectural Decisions

## 2026-03-20

### Repo naming
Chose `mini-maverick` — signals this is a focused prototype of the larger Maverick platform vision. Shows product awareness beyond just completing the task.

### Documentation strategy
- CHANGELOG.md: tracks *what* changed and AI usage (required by assessment)
- docs/decisions.md: tracks *why* — architectural reasoning and trade-offs
- Both feed into the required write-up and "how you used AI" interview discussion

### OpenClaw research (44m)
Watched intro videos (Alex Finn's complete OpenClaw guide) and read articles to understand core concepts: what OpenClaw is, how it differs from ChatGPT/Claude, use cases (daily briefs, workflows, Discord integration), skills system, memory, mission control. Also read architecture overviews and setup guides via Claude Code research agent.

Takeaway: OpenClaw = model-agnostic agent OS, not a chatbot. Single-user, runs locally, 22+ messaging channels. For the assessment, the critical gap is the gateway WebSocket protocol — handshake, message formats, streaming. That's next.

### Planning process (brainstorming session ~2h)
Used Claude Code with brainstorming skill to plan the architecture. Started with broader Maverick product context (B2C chat agents SaaS, containerized OpenClaw per user, OAuth integrations) then narrowed to mini-maverick technical assessment scope. Wrote infrastructure design doc comparing approaches (single-tenant containers vs shared infra), considering scaling, monitoring (Sentry, OpenTelemetry), and migration paths post-validation.

Key suggestions I made during planning:
- **TanStack Query + local-first persistence**: use react-query for state management with IndexedDB persistence (Dexie) — survives refresh, offline-friendly, aligns with Maverick's eventual multi-device sync needs
- **Component library**: evaluated react-aria and Base UI (MUI), settled on shadcn/ui (Base UI primitives) for chat-optimized UI — lightweight, composable, good for streaming message rendering
- **Git workflow**: each feature = separate branch → PR → squash merge to master after review. Keeps history clean, enables incremental code review
- **OpenClaw as dev tool**: considered using the OpenClaw instance itself to help develop later tasks after Docker setup — meta approach, though not pursued
- **Reference product**: identified sintra.ai as the simpler B2C agent app category we're competing with (vs LangChain at the complex end)

### Architecture choices
- **3-service Docker stack**: OpenClaw + Fastify backend + React frontend. Backend is protocol translator — frontend speaks simple WS, backend speaks full OpenClaw gateway protocol
- **Why proxy pattern**: OpenClaw gateway protocol is complex (challenge-response handshake, typed JSON frames, session management). Frontend shouldn't know about this. Backend abstracts it to simple `message → deltas → done` flow
- **Why Fastify**: lightweight, native WS support via @fastify/websocket, fast startup, good TS support. Express alternative considered but Fastify has better perf and plugin ecosystem
- **Why Dexie over raw IndexedDB**: ergonomic API, reactive queries via dexie-react-hooks, versioned schema migrations. Raw IndexedDB API is verbose and error-prone
- **Streaming strategy**: ref-based accumulator with requestAnimationFrame batching — prevents re-render storm from rapid WS deltas while keeping UI responsive

### Backend independence from OpenClaw

Backend starts without waiting for OpenClaw — no `depends_on` blocking startup. If OpenClaw is unavailable, backend sends `{ type: "status", connected: false }` to frontend clients and returns an error when they try to send messages. Reconnection happens automatically in background (3s retry).

**Why:** Decouples services — backend should serve the frontend regardless of OpenClaw state. Frontend can show a meaningful "OpenClaw unavailable" warning instead of the whole stack failing to start. Also enables development/testing of frontend without OpenClaw running.

## 2026-03-23

### Ed25519 device auth integrated into handshake

OpenClaw gateway v3 requires device authentication (Ed25519 keypair) to obtain `operator.write` scope needed for `chat.send`. Integrated directly into Phase 2 rather than as a separate bonus branch — it was a hard requirement for the handshake to succeed, not optional.

Device ID derived as full 64-char SHA-256 hex of the raw 32-byte Ed25519 public key. Keypair persisted to `DATA_DIR/device-key.json` (Docker volume `./data`) so the same device identity survives container restarts.

First run requires manual device approval: `docker exec mini-maverick-openclaw-1 node openclaw.mjs devices approve <requestId>`. Once approved, subsequent restarts reconnect automatically.

### Docker workspace volume permissions fix

`openclaw-workspace` named volume is created by Docker with `root` ownership, but OpenClaw runs as `node`. This caused `EACCES` errors when OpenClaw tried to read/write workspace files (e.g. `AGENTS.md`), which made chat requests fail.

Fix: added an `openclaw-workspace-init` init container (`user: root`, `restart: "no"`) that runs `chown -R node:node /home/node/.openclaw/workspace` before OpenClaw starts. OpenClaw `depends_on` this service completing successfully.

**Why this approach over alternatives:**
- `docker compose exec` chown at runtime: requires manual step, breaks on fresh deploys
- Named volume with custom driver: overengineered for this case
- Init container: self-contained, runs once per volume creation, idiomatic Docker pattern
