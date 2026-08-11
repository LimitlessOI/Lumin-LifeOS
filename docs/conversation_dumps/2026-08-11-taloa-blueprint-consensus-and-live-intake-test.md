<!-- SYNOPSIS: Founder capture -- Taloa Universal Overlay blueprint independent-draft consensus process and live BuilderOS intake test, 2026-08-11. -->

# Taloa Universal Overlay blueprint — consensus process and live intake test (2026-08-11)

## Context

Same-day continuation of the Universal Overlay work. Adam asked for a full
manufacturing-grade architecture blueprint for "Taloa Universal Overlay &
Fluid UI" — built repository-grounded (this session read `runBrowserGoal()`,
`ScreenControl.swift`, `LifeosAccessibilityService.java`, the governance
layer, Capsules/templates, Digital Twin, and security/model-routing/latency
directly, not from memory). A second, independently-produced draft came from
ChatGPT, built without repository access, per Adam's own explicit design:
two independent drafts on the same problem, compared, discussed, merged into
one consensus document, before any of it goes near the real build system.
This capture exists so the process and the founder decisions inside it
survive past this session's chat history, per SO-004.

## The process, in the founder's own words

On why two independent drafts, not one collaborative one: *"we're using the
same principle that our system set up. Independent thought with the similar
information, both working towards the blueprint, then we compare your each
of your blueprints, then we see what you did right... till we have consensus
on one blueprint, then we send it into the system to see what they find
out."*

On why repository access mattered for this pass specifically: *"Chief.
Engineer. You have access to the rebuilds. ChatGPT doesn't know that. to
make the best calls we can... it sounds like we're close enough that won't
make much difference. test out against real world and make different
choices, so we'll be fine."* Followed by, plainly: *"you are the chief
engineer."* — explicit delegation of architectural authority for
repo-grounded calls, not a standing blank check beyond that scope.

## Real founder decisions ratified directly (not inferred by either draft)

Two real category errors were caught during the second ChatGPT review round:
repository evidence proving *what exists today* had been silently treated as
evidence *against* a founder decision that simply hadn't been written back
into the code yet. Both were resolved by asking Adam directly rather than
guessing:

- **"Digital Imprint" is the ratified target name** for what the live
  system still calls "Digital Twin" everywhere (~685 references). The
  repo's own naming-proposal record (2026-08-04) says "not adopted" — true
  about the code, not true about the decision. Confirmed directly by Adam,
  2026-08-11.
- **"Conductor" is the ratified target name** for what the live
  system still calls "Chair" throughout (`services/lumin-chair-orchestrator.js`,
  `services/council-service.js`, etc.). Same pattern, same fix: confirmed
  directly rather than assumed from either draft.
- **"Capsule" stays the parent conceptual class**, with "Operational
  Capsule" as this blueprint's disambiguated technical subtype — the repo
  already has two other real, live, unrelated things called "Capsule"
  (Memory Capsule — personal-fact trust records; REP Capsule — Council
  deliberation context bundles) that a rename would have collided with.
  ChatGPT's second-round proposal (keep the word, namespace the subtype)
  was adopted over this session's own first-round instinct to just rename
  it outright.

Both renames are applied via a new documented pattern in the blueprint
itself: an explicit **As-Is Reality / Ratified Target / Migration Bridge**
table, so a repo-state fact never again gets silently read as a founder
rejection.

## Founder principles surfaced live during this process

**System self-execution, restated freshly in this context:** *"I shouldn't
be the one to hit it to start. The system does."* Directly connects to the
existing SYSTEM SELF-EXECUTION standing order — Adam re-asserting it in the
specific context of "should I click execute on this blueprint" rather than
treating it as already obviously settled.

**A new, sharp rule, found through a real live bug rather than stated in
the abstract first:** *"the queue is not allowed to make up anything. Just
slices of the blueprint."* Said directly after live evidence surfaced that
the intake system's own blueprint-generation step had fabricated full SQL
table schemas — real columns, real types — that were never specified in the
source document. See "Real findings" below.

**Direct, self-identified governance gap on Sentry:** *"it kinda sounds
like [Sentry]'s role is not well understood or established."* Matches what
this session independently found via direct repo research: Sentry has two
genuinely different meanings in this codebase (a per-file build-time
structural check that runs automatically inside the governed factory, and
the real SO-002 product-registry Layer A/B "is this actually done" gate) —
and the second one has never been registered for this product area at all.

**Parallel-build ambition, floated then deliberately scoped down in the
same breath:** Adam raised bringing Codex in and splitting the blueprint
into parallel-built pieces across multiple simultaneous builders — then, in
his own next message, scoped it back: *"Right now, we're just kinda
experimenting with you guys and working together instead of creating two
factories."* Real, standing question left open, explicitly not attempted
yet: who coordinates multiple simultaneous factories if that's ever built —
no mechanism for that exists today beyond the atomic `claimed_at`-null
claim pattern already proven twice in this repo (`extension_drive_sessions`,
`android_commands`), which is the natural extension point if this is
revisited, not something to invent fresh.

## Real findings from the live intake test — not hypothetical, actually run

The finished consensus blueprint was submitted through the real BuilderOS
"Backfill" intake flow (`POST /api/v1/blueprint/intake/backfill`, product
`universal-overlay`) — the actual, already-existing mechanism for "founder
has a finished document, get it into the governed build system," as
opposed to the conversational "greenfield" flow for brainstorm-stage ideas.

**First attempt died silently, cause fully diagnosed, not guessed:** the
session sat at `status: "generating"` for 9+ minutes with the DB row's
`updated_at` frozen 6 seconds after creation. Cross-referenced against
Railway's real deployment history: a concurrent session's unrelated commit
("GAP-FILL: set MTG upload chunk size to 104") triggered a redeploy at
17:42:54 UTC that killed the in-memory background AI-generation job
mid-flight. Real, general, currently-unmitigated gap: these sessions have
no staleness detection — a killed background job leaves the session stuck
forever with no error surfaced anywhere.

**Second attempt succeeded (~4 minutes).** Architect (ARC) review passed
clean — 0 critical/moderate/minor gaps, `ready_to_execute: true` — and the
extracted intent genuinely reflected the source document's real content:
all 8 named runtime components, all 7 canonical data stores, and acceptance
criteria that explicitly named both renames and the Capsule namespacing
resolution. Real evidence the document was actually read, not
pattern-matched.

**But dry-run execute (`dry_run: true`, no commits) surfaced two real bugs
before anything touched the repo:**
1. The intent-extraction step **ignored the explicitly-passed
   `product_name: "universal-overlay"`** and invented a new product name
   and SSOT path from the document's own title instead
   (`docs/products/TALOA Universal Overlay & Fluid UI/...`, non-standard
   spaces-in-path) — would have created a second, competing product home
   instead of extending the real one.
2. **The blueprint-generation step fabricated complete SQL schemas** for
   all 7 canonical stores (TaskStore, AuthorityLedger, ReceiptLedger,
   CapsuleStore, TemplateStore, DeviceRegistry, PreferenceStore) — exact
   column names and types that do not appear anywhere in the source
   blueprint, which only named the stores and their purpose. This is the
   live bug that produced Adam's "not allowed to make up anything" rule
   above, in real time, from real evidence.

Neither issue was silently worked around. Real execute was not run.

**Confirmed directly, not assumed: Sentry has not blessed any of this.**
What ran (ARC) is a deterministic structural check — duplicate IDs, missing
deps, SSOT tag *presence* (not correctness) — genuinely different from
Sentry's SO-002 product-completion gate, which requires registration in
`SENTRY_PRODUCT_REGISTRY.json` (currently three unrelated products only)
and has never run against this product area.

## What's still open — real next steps, not yet done

- Add real column specs to the blueprint document's canonical-store section
  so the generator has nothing left to invent on resubmission.
- Register this product (or a granular split of it) in the Sentry
  product-registry before any of it is presented as done.
- The coordination *mechanism* below is designed, not yet built.

## Governance design, resolved live — who decides how work splits across builders

Adam worked out, unprompted and in his own words across several messages,
a coherent answer to "if we ever run multiple builders in parallel, who
decides the split" — using a conductor/orchestra framing: *"the chair is
also high level office and the steward... it's like the conductor. And all
the other offices are like the orchestra and the blueprints, the music."*
Refined further: *"the decisions of what we break up and what parts and who
works on this and when it all comes together and what order and everything
should be decided by the steward then confirmed with the architect... then
those are the builders... I would have Stewart[sic — Steward] and the
efficiency officer have that discussion come to a consensus there based on
priorities, goals, speed. and then execute whatever they come up with in
consensus."*

Resolved into two separate consensus decisions, each owned by a different
pair of roles:
1. **What the parts are** — Conductor proposes the decomposition
   (parts, owners, sequencing, recombination point); Architect confirms,
   specifically checking for file-overlap between parts (the real,
   repeatedly-proven risk this session — concurrent-session git lock
   contention and staging contamination) and dependency ordering.
2. **Whether to spend the capacity** — Conductor + Efficiency
   Officer separately decide whether multiple simultaneous factories are
   worth it at all, weighing priorities/goals/speed against cost.

The queue (`BUILD_QUEUE.json`/ship-queue) is mechanical dispatch only,
never the decision-maker.

**A third real naming resolution came out of this same exchange:**
"Efficiency Officer" is confirmed as the same role as the existing,
3-way-fragmented "CFO" (whose own documented Voice Rail seat already reads
"stewardship — speed, spend, ROI, model scorecards") — with an explicitly
**expanded** scope beyond the original CFO framing, and the founder's
stated naming preference: *"I think I like efficiency officer better. It
just gets better than a CFO, I think."* Zero real code currently implements
this role under either name (confirmed by repo-wide grep) — it exists only
as doctrine today. Added to the blueprint's own As-Is/Ratified-Target/
Migration-Bridge table alongside the other two renames.

**What's real vs. designed-but-unbuilt, stated plainly:** Conductor,
Architect, Sentry, and the Builder/ship-queue pipeline are all real, live
code. Efficiency Officer has none. The specific mechanism connecting
Steward-proposes/Architect-confirms/dispatch-follows does not exist as a
route or service yet — real, well-scoped next work, not something to
assume already built.
