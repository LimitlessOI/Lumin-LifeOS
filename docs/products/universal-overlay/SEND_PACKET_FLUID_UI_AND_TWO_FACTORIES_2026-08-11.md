<!-- SYNOPSIS: Sendable founder brief — fluid UI field lessons adopted into the Taloa blueprint, and the two-factory competition model as actually built, 2026-08-11. -->

# Send packet — Fluid UI lessons + two factories (2026-08-11)

Everything below is either already written into a blueprint or already running. Nothing here is aspiration.

---

## PART 1 — Fluid UI: what the field already learned, and what we adopted

We are not first. Google's **A2UI** (Apache-2.0) and **AG-UI/CopilotKit** are live standards; Atlas, Everywhere, Gemma Wagon and Spark Desktop already ship OS-level agent overlays. Founder position: *"We don't have to be first, it means we can learn from them."*

**We independently converged on the hardest part.** Our `ViewIntent` → closed set of 18 approved primitives is the same mechanism A2UI arrived at: the model expresses intent, a trusted catalog renders, no model-authored code ever reaches the surface. Two independent designs landing on the same answer is the strongest available signal it is correct. **No change needed.**

**We are ahead in one place.** Not one surveyed overlay product defines *who owns a keystroke*. Our four input-ownership zones (`PASSTHROUGH` / `TALOA_INTERACTIVE` / `SHARED_GUIDED` / `MODAL_HUMAN_STEP`) have no counterpart in Atlas, Everywhere or Spark Desktop. It is the hardest problem in a real overlay and everyone else left it implicit.

**Seven corrections adopted — now blueprint §65a:**

**A. Fixed envelope, composed fill.** A named set of elements never moves no matter what the composer decides: the Body anchor, the way to reach a human, the dismiss control, the authority indicator. *Why:* the most consistent production failure in the field is not a bad composition, it is users losing their bearings when the frame moves. Cheapest item here — it is a constraint, not code.

**B. Deterministic fallback is the floor, not the polish.** If a `ViewIntent` fails validation, names an unknown primitive, or blows the latency budget, render a known-good default and record the failure. The composed surface is the upgrade, never the requirement. *Why:* everyone who built this last shipped visible blank panels first.

**C. Same intent, same surface — as a test.** Identical intent plus identical data must produce an identical composed tree; hash it and assert stability. *Why:* the field's blunt version is "if your team can't test it, your customers are the test."

**D. Dismissible and steerable.** The user can always clear a composed surface and restate. *Why:* it turns a bad composition from a trap into a retry. Sticky unclearable dynamic UI is the single most-reported friction in shipped generative UI.

**E. Serialize output in A2UI's shape.** `ViewIntent` stays ours and stays intent-level — deliberately a step above A2UI's component-level payload. But composer *output* should serialize as A2UI-compatible messages: flat adjacency list with ID references, streamed incrementally. *Why:* the flat shape exists because models generate and self-correct incrementally and cannot emit perfect nested JSON in one shot. And with Google, AWS, Microsoft and LangChain converging, fluency is cheap now and expensive later.

**F. Primitive-level telemetry.** Record which primitives each composition used and which the user touched. *Why:* the catalog is the product surface; without this there is no evidence for which primitives earn their place.

**G. Template replay is the cost story.** Our own blueprint already ranks it the highest value-per-effort item in the document. Template *capture* ships today; template *replay* is 0% built — no templates table, no lookup-before-run, so every driven task re-runs full reasoning every time. The field reached the identical conclusion: generate once, cache the tree, reuse. **Added requirement:** a composed surface, not just a driven task, is a cacheable template.

**Explicitly rejected: making everything fluid.** A year of production evidence says high-frequency muscle-memory flows want consistency, and fully-generative products hit cost and relearning walls. The founder's own framing — capture each screen as an adjustable template — is the mature pattern, not a compromise with it.

---

## PART 2 — Two factories: the model as built

**Peers, not a hierarchy.** Neither outranks the other. Temporary roles (integration owner, component manufacturer, adversarial reviewer) are scoped to one manufacturing plan and confer no standing authority. Next build the roles may reverse.

**The Conductor splits the work, but not alone.** Constitutional three-party consensus before anything reaches the queue: **Conductor** (sequencing, decomposition, assignment), **Architect** (will these pieces, assembled this way, produce the specified system), **Builder/Factory** (can this be built as specified without unstated decisions). Each seals for its own jurisdiction; a plan edited after sealing invalidates the seals. Only then is the state `MANUFACTURING_AUTHORIZED`. The queue executes an authorized plan — it never invents architecture.

**Competition is scored against Reality, not output.** Rewarded: first-pass Reality success, blueprint fidelity, defects caught before handoff, legitimate detection of a peer's defect, honest uncertainty, simplicity, reuse, integration quality, verified lessons. Efficiency counts only after correctness gates pass.

**Explicitly not scored** — recorded as forbidden signals that move the score by exactly zero: bugs fixed, lines of code, missions completed, speed to completion. Each of those teaches the wrong behavior.

**Finding your own mistake beats hiding it.** Self-caught defects outscore escaped ones. Concealment is not a bigger error — it is a *different class* of event, trustworthiness rather than capability, and it carries a far larger penalty.

**No single score.** A capability profile across independent dimensions, so the system can learn "factory 1 is strongest on architecture-heavy integration, factory 2 catches persistence failures" and allocate work on evidence instead of belief.

**Redundant cognition for expensive-to-be-wrong work.** Ordinary slices split for speed. High-risk slices (authority, security, payment, migration, governance) go to both factories independently, neither seeing the other's answer. Convergence raises confidence; divergence routes to the Consensus Protocol rather than a vote.

**Systemic failure routes upstream.** If independent factories keep failing the same way, that is evidence about the blueprint, the incentives or the architecture — not about the individual builder.

**Status, honestly:** `factory-2` is now provisioned as a real git worktree with its own index, so two factories can no longer collide on a git lock or contaminate each other's staging. Parallel and redundant allocation are implemented and tested. Live two-factory production is being proven now.

---

## PART 3 — What is actually blocking manufacturing

The governed loop ran the frozen Overlay fixture end to end tonight and produced **9 questions it is not permitted to answer itself** — 7 unspecified data stores plus a dependency cycle and a missing field. They are collected in one place: `docs/products/builderos/FOUNDER_DECISION_SET_OVERLAY.md`.

**The highest-leverage one is `TemplateStore`.** It is the store behind template replay — the item our own blueprint ranks first and the item that makes composed UI cheap. Answering that single question unblocks it.
