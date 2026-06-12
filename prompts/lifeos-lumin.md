# Domain: Lumin AI

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).

**Last updated:** 2026-04-25 — Council `POST /api/v1/lifeos/builder/task` and `POST /build`: **`files`** array may list repo-relative paths; the **server reads those files** and injects their contents into the council prompt (per-file and total caps in `routes/lifeos-council-builder-routes.js`). Use this for large overlays (e.g. `public/overlay/lifeos-chat.html`) so `/build` is not blind. Prior: 2026-04-22 — `GET /build/ops` aggregates; build bridge routes + `lumin_programming_jobs` table documented.
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning service:** `services/lifeos-lumin.js` (+ `services/lifeos-lumin-build.js` for governed programming bridge)
**Owning routes:** `routes/lifeos-chat-routes.js`
**Mounted at:** `/api/v1/lifeos/chat`

---

## What This Domain Does

Lumin is the named conversational AI — the **primary companion surface** in the LifeOS shell (`lifeos-app.html`: persistent **Ask Lumin…** strip, ◎ drawer/FAB, topbar ◎, full-page `lifeos-chat.html`). Users address it as "Lumin" or "hey Lumin". It has 7 modes (general/mirror/coach/finance/relationship/health/planning) and persistent conversation threads. Responses are shaped by the **response variety** engine + **communication profile** (adaptive, anti-formulaic) — encouraging and idea-forward **without** mandatory interview-style forms unless the user chose a structured flow.

**Conversational-first (product direction):** prefer extracting durable state from **natural dialogue** with explicit consent and receipts over blank-form capture; see Amendment 21 `### Lumin — companion front door`.

**Relational discovery (2026-04-20):** `LUMIN_EPISTEMIC_CONTRACT` in `services/lifeos-lumin.js` allows optional, sparse reflective questions or mirroring statements grounded only in thread + stored LifeOS context — no fabricated private facts, no mandatory onboarding forms, user can always decline.

---

## Tables Owned

| Table | Purpose |
|---|---|
| `lumin_threads` | Conversation threads — user_id, mode, title, pinned, archived, last_message_at |
| `lumin_messages` | Messages — thread_id, user_id, role (user/assistant/system), content, content_type, tokens_used, reaction, pinned |
| `lumin_programming_jobs` | Build bridge — user_id, thread_id, kind (`plan`/`draft`/`pending_queue`), status, step_detail, result_text/meta, optional `project_slug` + `domain` |

GIN full-text search index on `lumin_messages.content`.

---

## Services

```
createLifeOSLumin({ pool, callAI, logger })
  .createThread(userId, { mode, title })
  .listThreads(userId, { includeArchived, limit })
  .getThread(threadId, userId)
  .updateThread(threadId, userId, updates)
  .getMessages(threadId, { limit, before })
  .getPinnedMessages(threadId)
  .pinMessage(messageId, userId, pinned)
  .reactToMessage(messageId, userId, reaction)   // thumbs_up / thumbs_down / null
  .searchMessages(userId, query, { limit })
  .chat(threadId, userId, userMessage, { contentType })
  .buildContextSnapshot(userId)                  // MITs + scorecard + commitments + joy + user profile
  .getOrCreateDefaultThread(userId)
```

---

## Route Surface

```
GET    /api/v1/lifeos/chat/threads              list threads
POST   /api/v1/lifeos/chat/threads              create thread
GET    /api/v1/lifeos/chat/threads/default      get or create default general thread
PATCH  /api/v1/lifeos/chat/threads/:id          update title/mode/pinned/archived
GET    /api/v1/lifeos/chat/threads/:id/messages get messages (with pagination)
POST   /api/v1/lifeos/chat/threads/:id/messages send message + get reply
GET    /api/v1/lifeos/chat/threads/:id/pinned   get pinned messages
PATCH  /api/v1/lifeos/chat/messages/:id/pin     pin/unpin a message
PATCH  /api/v1/lifeos/chat/messages/:id/react   react to a message
GET    /api/v1/lifeos/chat/search?q=            full-text search across messages

GET    /api/v1/lifeos/chat/build/health         build bridge readiness (DB + council wiring, `lumin_programming_jobs` probe; includes error diagnosis, no AI call)
GET    /api/v1/lifeos/chat/build/ops?user=&hours=  read-only aggregates: job counts, stuck `running`, top `failed` errors, duration p95 (no AI)
POST   /api/v1/lifeos/chat/build/plan           body: user, goal, optional domain, project_slug, thread_id — council plan + job row
POST   /api/v1/lifeos/chat/build/draft          body: user, goal, optional domain, spec, files[], project_slug, thread_id — council draft + job row
POST   /api/v1/lifeos/chat/build/pending-adam  body: user, title, description?, project_slug?, type?, priority?, thread_id?, job_id? — inserts `pending_adam` (governance)
GET    /api/v1/lifeos/chat/build/jobs?user=     recent programming jobs (progress polling)
GET    /api/v1/lifeos/chat/build/jobs/:id?user= one job (status, result_text, error_text)
```

**Honesty:** these endpoints **do not** auto-commit to git or mutate production files — they produce council text and/or queue `pending_adam` for Adam/builder workflows.

**Council builder (`/api/v1/lifeos/builder/task`, `/build`, `/execute`):** When calling **`mode: "code"`** against a large existing file, pass **`files`: `["public/overlay/lifeos-chat.html"]`** (and any other paths the model must preserve). The builder route injects file bodies before the task text so the council can return a **full-file replacement** for `target_file` / `---METADATA---` placement. Without `files[]`, the model only saw path names — insufficient for safe edits to thousand-line HTML.

---

## Model Guidance

| Task | Model | Why |
|---|---|---|
| `chat()` — the actual conversation | `gemini_flash` (via `council-prompt-adapter` + env member) | User-facing, quality matters, free |
| `lifeos.lumin.program_plan` / build plan | `gemini_flash` | Structured plan, `task-model-routing.js` |
| `council.builder.code` / `council.builder.plan` / `council.builder.review` | `gemini_flash` | `task-model-routing.js` explicit keys |
| `council.builder.task` (legacy) | `gemini_flash` | Codegen-style draft for review |
| `buildContextSnapshot()` | no AI, pure DB queries | Fast, no cost |
| `searchMessages()` | PostgreSQL GIN index, no AI | Instant, no cost |

---

## Key Implementation Notes

- **Response variety IS wired** (fixed 2026-04-19). `wrapPromptWithVariety()` from `services/response-variety.js` is called in `chat()`. Styles are logged after each reply. Do NOT stub this out or revert it.
- **Communication profile IS wired** — handled inside `wrapPromptWithVariety`, not manually. Do not add a separate manual `communication_profiles` query.
- **Context snapshot** — `buildContextSnapshot(userId)` returns today's MITs, latest scorecard, active commitments count, latest joy, user profile basics. Add more fields here as new services are built (sleep, habits, net-worth).
- `CONTEXT_WINDOW = 20` messages of history included in every AI call.

---

## What NOT to Touch

- Do not revert the `createResponseVariety` import or the `wrapPromptWithVariety` call in `chat()`.
- Do not add a manual `communication_profiles` query — it's already in `wrapPromptWithVariety`.
- Do not change the `lumin_messages` full-text index — it's the search backbone.

---

## UI

`public/overlay/lifeos-chat.html` — full chat interface.
- Sidebar: thread list, mode filter chips, new thread button, search
- Main: message bubbles (user right, assistant left), typing indicator, context bar (MIT count, day score, joy from `/scorecard/today`), input with voice button
- Message actions on hover: Copy, 👍, 👎, Pin/Unpin
- Voice input: Web Speech API `SpeechRecognition`
- Markdown rendering: code blocks, inline code, bold

---

## Next Approved Task

Wire engagement feedback on reactions. When a user reacts (👍/👎) via `PATCH /messages/:id/react`, call `variety.recordEngagement()`:

```js
// In lifeos-chat-routes.js, after reactToMessage succeeds:
if (result && styles) {
  await variety.recordEngagement({
    userId,
    styles,       // stored on the message when it was created
    context:      thread.mode,
    engagementSignal: reaction === 'thumbs_up' ? 'positive' : 'negative',
    responseLength: result.content?.length || 0,
  });
}
```

Problem: `styles` are not currently stored on the message row. Need to either (a) add a `styles_used JSONB` column to `lumin_messages` or (b) re-derive from `response_variety_log` by matching `user_id + created_at` timestamp.
