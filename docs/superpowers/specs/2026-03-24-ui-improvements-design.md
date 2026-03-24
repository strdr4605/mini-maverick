# UI Improvements Design

**Date:** 2026-03-24
**Branch:** `feat/ui-improvements`
**Scope:** Markdown rendering, backend message persistence, typing/streaming indicator

---

## 1. Markdown Rendering

**Library:** `react-markdown`

Assistant message content rendered via `<ReactMarkdown>` instead of plain text. Inline styles applied directly via Tailwind classes on component overrides (no `@tailwindcss/typography` plugin needed):

- Code blocks: `bg-gb-bg2` monospace font
- Inline code: `bg-gb-bg2 px-1 rounded`
- Links: `text-gb-blue underline`
- Lists: `list-disc pl-4` / `list-decimal pl-4`

Streaming messages also render through `<ReactMarkdown>` — valid at every intermediate state.

User messages remain plain text (no markdown rendering needed).

---

## 2. Backend Message Persistence + REST Endpoint

### Backend

**Storage:** SQLite via `better-sqlite3` — file-based, no extra service, persists to existing Docker `./data` volume.

**Schema:**
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,       -- 'user' | 'assistant'
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
```

**New route:** `GET /api/messages` — returns all messages ordered by `createdAt` as JSON array.

**Write points:**
- User message: written to DB in `handler.ts` when `type: "message"` received from frontend
- Assistant message: written to DB in `handler.ts` on `done` event (final content from ref)

### Frontend

- **Remove Dexie** — delete `db.ts`, remove `dexie` dependency
- **`useChat`:** replace `db.*` calls with `fetch('/api/messages')` via TanStack Query
- On `done`: call `queryClient.invalidateQueries(["messages"])` to re-fetch from backend
- Streaming message stays in local React state (not persisted until `done`)
- Vite proxy config: `/api` → `http://localhost:3001` (dev), nginx proxy (Docker)

---

## 3. Typing / Streaming Indicator

Add `waiting` boolean state to `useChat`:
- Set `true` in `send()` (after message sent, before first delta)
- Set `false` on first `delta` received (streaming takes over)
- `streaming` stays `true` until `done`/`error`

In `App.tsx`, show animated typing bubble when `waiting || streaming`:

```
● ● ●  (animated pulse, assistant bubble style)
```

- Replaces the cursor blink (`animate-pulse` span) entirely
- Bubble uses same `bg-gb-bg1 text-gb-fg rounded-bl-sm` style as assistant messages
- Three dots animated with staggered `animation-delay` for wave effect

---

## Implementation Plan

Single branch `feat/ui-improvements`, one PR.

**Order:**
1. Backend: add `better-sqlite3`, create `db.ts` module, `GET /api/messages` route, write messages in handler
2. Frontend: remove Dexie, update `useChat` to fetch from `/api/messages`, add `waiting` state
3. Frontend: add `react-markdown`, render assistant messages
4. Frontend: add typing indicator component, wire to `waiting || streaming`
5. Update nginx.conf to proxy `/api` to backend
6. Update docker-compose if needed
7. CHANGELOG + decisions update
