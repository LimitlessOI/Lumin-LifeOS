<!-- SYNOPSIS: Founder Alpha Chat v2 — concrete wiring backlog for BOS -->

# Founder Alpha Chat v2 — concrete wiring backlog

These are the remaining LifeOS conversational support features Adam described on 2026-07-12. The services `services/lifeos-commitment-service.js`, `services/lifeos-note-capture-service.js`, and `services/lifeos-chat-intent-router.js` already exist (done in earlier steps). The remaining work is to wire them into the live chat route and orchestrator so the chat actually executes commitments, notes, check-ins, and build requests instead of returning placeholder text.

## Approved Product Backlog

- **Target file:** `routes/lifeos-builderos-command-control-routes.js` — **Task:** Add an `executeChatIntent` helper that, before calling `runLuminChairTurn`, inspects the incoming message with `services/lifeos-chat-intent-executor.js` `classifyIntent` and, for `commitment`, `note`, `check_in`, or `build_request` intents, returns the formatted result directly. For all other intents, fall through to the existing Chair turn. Use an additive `old_string`/`new_string` patch and preserve the existing auth, logging, and timeout logic.
- **Target file:** `services/lumin-chair-orchestrator.js` — **Task:** Patch `runLuminChairTurn` so that when `chair_channel` is `'life_admin'`, it calls `services/lifeos-chat-intent-executor.js` `executeIntent` first and, if an executable intent is returned, skips the council counsel path and returns the executor's formatted reply with `chair_channel: 'life_admin'` and `execution_kind: 'command'`.
- **Target file:** `services/lifeos-chat-intent-executor.js` — **Task:** Create the new module. Export `classifyIntent(text)`, `executeIntent({ db, userId, timezone, intent, text })`, and `formatReply(result)`. Implement `commitment` by calling `services/lifeos-commitment-service.js` `captureCommitment`; `note` by calling `services/lifeos-note-capture-service.js` `captureNote`; `check_in` by replying with the daily check-in prompt and, on a follow-up, storing a note with `source: 'check-in'`; `build_request` by parsing a product/feature mention and routing to the governed `/factory/execute-step` endpoint (or the existing founder build executor if available). Return a truth-enforced card with `Status:`, `Transport:`, `File:`, and `Commit:` lines for build requests, and a human summary for commitments/notes/check-ins.
- **Target file:** `public/overlay/lifeos-app.html` — **Task:** Replace the legacy `/shared/lifeos-ambient-listener.js` script tag with `/overlay/lifeos-ambient-listener.js` so the overlay version (with mic ducking and transcript-to-chat routing) is active. Also ensure the thought-stream container (`#thought-stream`) is created and `public/overlay/lifeos-chat-thoughts.js` `renderThoughtStream` is called whenever a chair reply includes `thought_stream`.
- **Target file:** `public/overlay/lifeos-ambient-listener.js` — **Task:** Patch the DOM selector and transcript dispatch so that voice-transcribed text is inserted into `#lumin-input` and, when the mic is released and the transcript looks like a command/note/commitment, the listener can optionally call `document.getElementById('lumin-send')?.click()` only after explicit confirmation (e.g. a short on-screen "Send?" tap).
- **Target file:** `services/lifeos-commitment-service.js` — **Task:** Patch `parseNaturalLanguage` to recognize "what have I got scheduled", "show my appointments", and similar phrases and return a query mode so `getCommitments(db, userId)` can be called and the results formatted into a reply card.

## Implementation constraints

- Do **not** rewrite the whole chat route or orchestrator; use additive `old_string`/`new_string` JSON patches.
- All new files and patches must include `@ssot docs/products/lifeos/PRODUCT_HOME.md`.
- Prefer `db` pool first argument and parameterized `pg` queries in any new module.
- The chat route and orchestrator are large (~60KB); ensure patch-mode is selected by the builder.
