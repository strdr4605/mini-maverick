# Changelog

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
