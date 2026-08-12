<!-- SYNOPSIS: Founder capture — prior-art research on fluid/generative UI and OS-level AI overlays, and what to copy for the Taloa Universal Overlay, 2026-08-11. -->

# Fluid UI prior art — what the field already learned (2026-08-11)

## Context

Adam, after seeing ~12 runaway Chrome windows the automation-browser watchdog had opened: *"this is not the ui i want or the comunication set up like its not good we need the overlay as our ui with fluid ui is there anyone else using a fluid ui are we like the first."*

Then, on being told we are not first: **"I don't mind if we're not first it means we can learn from them. Do some research and see what they're doing well."**

That posture is the reason this capture exists. Being second with the field's failure data is a better position than being first without it.

## Are we first? No.

**Generative UI is a live standards race.** Google published **A2UI** (Agent-to-User Interface), Apache-2.0, with contributions from CopilotKit — a declarative protocol for agents to stream UI. **AG-UI** is the adjacent transport-level protocol, adopted by Google, AWS, Microsoft and LangChain. Flutter's team has entered the space officially. Vercel's AI SDK `streamUI` covers the React/RSC end.

**The OS-level overlay half also exists.** Atlas (Electron, transparent overlay, Gemini Computer Use API, robotjs). Everywhere by Sylinko (Windows/macOS, accessibility APIs for structured screen context). Gemma Wagon (fully local, Tauri, floating orb). Google's Spark Desktop (system-wide agent across every app).

Both halves of our concept are claimed. The combination — overlay **plus** generative surfaces **plus** a governed manufacturing system behind it **plus** long-term personal memory — was not found in the research.

## What they are doing well — the things worth copying

**1. Send data, not code (A2UI's core decision).** The agent emits declarative JSON describing UI *intent*; the client renders it with its own native widgets. There is no logic in the message, so there is no XSS surface. "Safe like data, expressive like code."

**2. The catalog is an allowlist.** The agent may only request components from a pre-approved catalog. Unknown component → silently ignored. **This is our no-invention law applied to the interface**, and we already built the constitutional machinery for exactly this shape of rule today.

**3. The wire format is shaped for how models actually emit.** A2UI uses a flat adjacency list with ID references, not a nested tree, specifically so an LLM can stream it incrementally and correct itself mid-generation instead of needing perfect JSON in one shot.

**4. Surface vs fill.** Design the envelope once — navigation, the primary action, how to reach a human — and let the agent compose only what goes inside it. The consistent finding: *most generative UI failures happen when the envelope breaks and users lose their bearings.*

**5. Bounded generation, not code generation.** The field converged hard here. Selection over a registered inventory with schema validation is production-safe; an LLM emitting raw JSX at runtime is "a science project." Failure modes are removed by shrinking the surface they occur on, not by hoping the model improves.

**6. Deterministic fallback is the floor.** Schema validation fails, model returns nothing usable, or latency exceeds budget → render a plain answer or a stock view. **The dynamic UI is the upgrade, never the requirement.**

**7. Do not make muscle-memory flows fluid.** Generative fits ad-hoc, rare, varied, personalised tasks. The 80% of daily work wants consistency; an interface that reshuffles between visits makes people relearn the product every visit. Hybrid is the mature form, per a full year of production reports.

**8. Same situation must reliably produce the same experience.** Otherwise QA is impossible — "if your team can't test it, your customers are the test."

**9. Cost discipline.** Composing UI per interaction burns tokens on every render. The working pattern is generate once, cache the tree, reuse.

**10. Overlay-specific craft.** Hotkey invocation; a persistent orb; **showing the agent's cursor moving on screen so the user always knows what it is doing**; accessibility APIs for structured context rather than screenshots alone; a local-only mode for privacy; per-persona isolated memory. Dismissibility matters — a generated surface the user cannot clear is a trap.

## Implications for the Taloa Overlay

- **Speak A2UI rather than invent a payload format.** Same reuse discipline the constitution already enforces: if a standard exists and is being adopted by the majority of the ecosystem, fluency is cheap now and expensive later.
- **Define a Taloa component catalog as an allowlist**, and enforce it with the mechanism class we already built for no-invention.
- **Fix the envelope.** Decide which elements never move regardless of how dynamic the fill becomes.
- **Ship the deterministic fallback first**, not last — it is the floor everything else stands on.
- **Honest risk:** the single thing every source warns about is precisely our temptation — making the whole interface fluid. The evidence says hybrid.

## What we have that they do not

Real accessibility drivers on macOS and Android, a governed factory with authority and receipts behind the surfaces, and persistent personal memory. The overlay competitors are mostly a chat box that floats; the generative-UI competitors are mostly protocol and framework layers with no system of record underneath.
