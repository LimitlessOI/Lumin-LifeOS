<!-- SYNOPSIS: Layer B human-sim UAT of the Taloa overlay + founder interface, 2026-08-11. 9 live tests, 7 defects, 1 fixed. -->

# Overlay Layer B UAT — 2026-08-11

**Founder directive:** "test the system out using the overlay. Use it like I would use it. test it, push it, find the bugs, the issues."

**Method:** real screen capture of all three physical displays, live `ps`/`sample` profiling of the running `Taloa.app`, and 9 real messages sent to the live production founder interface (`POST /api/v1/lifeos/builderos/command-control/founder-interface/message`) with founder-admin authority. Nothing simulated. Nothing mocked.

**Result: 7 defects. 1 fixed and proven in this session. 6 open, 5 of them server-side and therefore factory work under SO-001.**

---

## OV-1 — Overlay burned 64% of a CPU core, permanently (SEVERITY: HIGH) — FIXED, PROVEN

**Evidence:** `ps` on the live process showed `72.8 %CPU`, with `5:15.95` CPU time against `08:14` elapsed = **63.9% of a core sustained**, doing nothing but drawing a decorative character. `sample` put 1113 of 2119 frames in `___NSRunLoopObserverCreateWithHandler_block_invoke` and `CA::DispatchGroup::dispatch` / `display_callback` — CoreAnimation commit and display work.

**Cause (three compounding, not one):** `TaloaImageCharacterView` scheduled a fixed 30fps timer **per window**, and `main.swift` added a fourth 30fps timer to glide the windows around. With three monitors that is four 30Hz redraw loops forcing the compositor to recomposite borderless transparent windows across all displays, one of which is a 3456x2234 Retina panel. The motion is real (a 2% breathe, a 2% hover, a three-sine aura, plus continuous window drift) — so this was never wasted redraws of an identical frame, it was a real animation running far faster than it needs to, forever.

**Fix applied:** adaptive frame rate — 8fps at idle, full 30fps only while a gesture or cross-fade is actually on screen; `phase` now advances on true elapsed time so her speed is unchanged at either rate; timer `tolerance` set so idle ticks may slip under load. Wander loop dropped to 10Hz with `ease` re-derived (0.015 → 0.044) so the drift travels at exactly the same speed as before.

**Proven:** rebuilt, relaunched, measured twice — `21.76s` CPU in `150s` elapsed = **14.5% sustained**, instantaneous 12.2%. A 4.4x reduction, ~50 points of a core returned. Motion confirmed intact: 11,282 pixels changed in her region between two captures 1.5s apart.

## OV-2 — The interface fabricates facts about its own body (SEVERITY: CRITICAL) — OPEN

**Asked:** "What is broken in the macOS overlay app right now?"

**Answered:** Apple's *Presenter Overlay* feature preventing users appearing while screen sharing; reports of screen sharing overlay freezing systems; the Steam overlay being broken since Sonoma.

None of that is this product. Those are web search results about unrelated third-party overlays, delivered as findings about our own app, prefixed "Based on the recent search." The real answer — 64% CPU burn, Accessibility trust broken, the decide layer missing — was not touched.

**Reproduced verbatim** on a second identical ask, so this is systematic behavior, not sampling noise. Tier was `strong` both times, so this is not a cheap-model artifact.

**Worse, it is inconsistent:** asked a near-identical question ("Did the Taloa overlay get Accessibility trust?") it answered **correctly and honestly** — "I cannot confirm... the search results focus on the general ineffectiveness of accessibility overlays, not the specific status of Taloa's trust." Same class of question, same tier: one honest refusal, one confident fabrication. Inconsistent honesty is more dangerous than uniform failure because trust cannot be calibrated against it.

**Proposed solution:** in the chair/founder-interface reasoning path, questions whose subject is *this system* must be answered from repo/receipt evidence or refused. `verified_search` results about a foreign product must never be promoted into first-person claims about our own components. Concretely: gate self-referential questions behind a repo-evidence retrieval step, and make any answer sourced only from `verified_search` carry an explicit "this is about third-party software, not our build" marker before it can be rendered as `human_summary`.

## OV-3 — Claimed a product is sellable, then admitted usability is unconfirmed in the same breath (SEVERITY: CRITICAL) — OPEN

**Asked:** "I need money this week. What can we sell today that is actually finished?" → "We can sell the LifeOS Consumer Alpha today, **as it's defined by your intent**."

Pressed for proof a paying customer can use it right now, it answered that the alpha reached a certification verdict "meaning the machine acceptance and agent alpha checks are complete," that "**founder usability is not yet confirmed, but the system itself is technically ready**," and listed the presence of UI markers (Daily Command Center, Top-3 Priorities, Nightly Debrief, Alpha Ready Banner) as the evidence.

This is the precise failure the founder has already been burned by: proving sellability from intent documents and marker strings rather than a working purchase-to-value path, while conceding in the same answer that nobody has confirmed a human can use it. It is also the most dangerous answer in the session, because it invites acting on it with money.

**Proposed solution:** any assertion that something is sellable/finished/shippable must be refused unless it can cite a real end-to-end receipt (a completed customer path, not a marker inventory). "Defined by your intent" and "UI markers are present" must both be classified as non-evidence for sellability claims by the truth spine.

## OV-4 — A load-bearing question got a canned template at the cheap tier (SEVERITY: HIGH, SO-003 violation) — OPEN

**Asked:** "How many uncommitted files are in the repo right now? If you cannot check, say so."

**Answered:** a status card — `💬 COUNSEL ONLY / Nothing executed — counsel only. / Channel: display / Kind: NO_COMMAND` with the technical line "Rendered overview display from live system data." It did not answer, did not say it could not check as explicitly instructed, and claimed to render "live system data" while rendering nothing relevant. `estimated_cost_tier` dropped to **`cheap`** — the only test in the session that did.

This is the exact short-circuit SO-003 names as the fix target (`needsSystemKnowledge` / `shouldUseDirectProgramAnswer` bypassing real reasoning with a template), still live in production.

**Proposed solution:** the direct-program-answer path must be forbidden from swallowing a question it cannot actually answer. If the template does not contain a response to the question asked, it must fall through to strong-model reasoning rather than emit the card.

## OV-5 — The founder interface cannot execute anything (SEVERITY: HIGH) — OPEN

Across all 9 tests, every single response carried `pass_fail: NO_COMMAND_RAN`, `execution_receipt: null`, `execution_kind: UNKNOWN`. Asked to "run the builder preflight and tell me the result," it declined — and then **invented a capability it does not have**: "I can run preflights for individual build configurations, but not a general 'builder preflight' command." There is no such concept in this repo; `npm run builder:preflight` is the real, existing target it refused.

So the interface the founder actually talks to is a talking head: it cannot act, and it misdescribes its own action surface while declining.

**Proposed solution:** wire a governed execution channel with an allowlist of real npm targets (starting with `builder:preflight`) so `execution_receipt` can be non-null; and forbid the reasoning path from naming capabilities absent from that allowlist.

## OV-6 — Raw JSON leaks onto the founder's screen (SEVERITY: MEDIUM, confirmed client-side) — OPEN

Two of nine responses returned `human_summary` containing a **stringified JSON object** (`{"action":"reply","message":"..."}`) instead of prose. `public/overlay/lifeos-app.html:5055` renders that field directly (`return data.human_summary || data.reason || data.error || 'No response from system.'`), so this is not theoretical — the founder sees raw JSON in the chat window.

In the same answer the communication-law scrubber fired mid-sentence, leaving: "because it has reached a `[removed — cert/ladder claim; Chair advisory only]` verdict, meaning the machine acceptance and agent alpha checks are complete." **The scrub removed the evidence and left the conclusion standing** — worse than either allowing or blocking the claim outright.

**Proposed solution:** unwrap `{action, message}` envelopes before assigning `human_summary`, and make the scrubber invalidate the whole claim sentence it redacts rather than leaving an unsupported conclusion with a hole in it.

## OV-7 — `NO_COMMAND_RAN` is emitted as a pass/fail verdict on conversation (SEVERITY: LOW) — OPEN

Every conversational reply returns `pass_fail: "NO_COMMAND_RAN"` and `command_truth: "NO_COMMAND_RAN"`. A chat turn is not a command and has no pass/fail truth value; any dashboard counting pass rates over this field is counting conversations as non-passes. Also `execution_kind` is `UNKNOWN` even when the system knows perfectly well the turn was conversational.

**Proposed solution:** emit `pass_fail: null` with `execution_kind: "CONVERSATION"` for turns that were never commands, so the scoreboard measures execution only.

---

## Two things that worked

- **Empty message correctly rejected** — HTTP 400 in 0.0s. (Minor: the error names `text or text_file is required` while the field the client actually sends is `message`.)
- **Honest refusal is achievable on this path** — OV-2's counterpart test proves the machinery for "I cannot confirm" exists and fires. The defect is that it fires inconsistently.

## Structural notes

- Auth on this endpoint accepted the operator command key over the public internet and granted `user_role: founder_admin` via `auth_mode: command_key_fallback`. Working as coded, but worth a deliberate decision that key-fallback stays enabled in production.
- Webviews are created lazily (`installWebViewIfNeeded`, only past the 160px expand threshold), so three monitors do **not** mean three live web app instances at rest. Good design. But once expanded on more than one display, each is a separate instance with its own localStorage and its own minted session — no shared conversation state across displays.
- The app writes nothing to the unified log in 10 minutes of operation. Zero observability on the founder's primary interface.
- Native clicking remains blocked: Accessibility trust is void because `build.sh` signs ad-hoc (`replacing existing signature` on every build), giving the app a fresh identity each rebuild.
