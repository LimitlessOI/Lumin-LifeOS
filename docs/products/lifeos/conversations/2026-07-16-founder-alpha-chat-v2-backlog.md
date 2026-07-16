<!-- SYNOPSIS: Founder Alpha Chat v2 — next build slice -->

# Founder Alpha Chat v2 — next build slice

These are the remaining LifeOS conversational support features Adam described on 2026-07-12. They must be built as small patch-mode edits to the existing `routes/lifeos-builderos-command-control-routes.js` and `services/lumin-chair-orchestrator.js` surfaces, plus a tiny new `services/lifeos-chat-intent-executor.js` module.

## Backlog

- **Commitment → calendar wiring** — when the founder says "dentist appointment at 2pm next Tuesday", classify the intent, call `services/lifeos-commitment-service.js` `captureCommitment(db, text, { userId, timezone })`, insert a `commitments` row, and reply with a confirmation card that includes the parsed title, datetime, and `calendar_event_requested: true`.
- **Note capture wiring** — when the founder says "note: remember to call the accountant" or "make a note that...", call `services/lifeos-note-capture-service.js` `captureNote(db, text, { userId, source: 'chat', tags })`, store the note, and reply with the saved summary + auto-suggested tags.
- **Daily check-in prompt** — when the chat is idle or the founder says "what have I worked on?", ask "Adam, what have you worked on for the last 15 minutes?" and, on reply, call `captureNote` with `source: 'check-in'` and optionally derive/check commitments.
- **Natural-language build router** — when the founder says "build me a habit tracker" or "add a trusted contact screen", classify as a BuilderOS request, infer the product_id and target_file, and route to `/factory/execute-step` or the existing founder build executor; reply with a build receipt card (`Status:`, `Transport:`, `File:`, `Commit:`).
- **Digital-twin context loader** — before the chair replies to personal-life questions, load the latest `founder_memory_index`, recent notes, commitments, and builder status into the prompt context so the answer is grounded, not generic.
- **Ambient listener toggle** — wire the existing `public/overlay/lifeos-ambient-listener.js` overlay so the mic button can optionally stream transcripts to the chat intent router and auto-capture notes/commitments only after explicit confirmation.
- **Thought-stream UX polish** — ensure `public/overlay/lifeos-chat-thoughts.js` renders collapsible thought blocks for every chair reply and for long-running build/status operations.

## Implementation constraints

- Do **not** rewrite the whole chat route; use additive `old_string`/`new_string` JSON patches.
- The new `services/lifeos-chat-intent-executor.js` module should export `classifyIntent(text)`, `executeIntent({ db, userId, timezone, intent, text })`, and `formatReply(result)`.
- Add one route import and one early `executeIntent` call inside `services/lumin-chair-orchestrator.js` `runLuminChairTurn` before it falls back to counsel, limited to `chair_channel: 'life_admin'` intents.
- All changes need a small `@ssot` tag pointing to `docs/products/lifeos/PRODUCT_HOME.md`.
