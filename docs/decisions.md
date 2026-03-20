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
