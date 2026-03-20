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
