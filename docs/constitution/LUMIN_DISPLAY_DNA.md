<!-- SYNOPSIS: Lumin Display DNA — live collapsible worklog; transparency by default, detail on demand -->

# Lumin Display DNA — Constitutional

**Status:** SUPREME DISPLAY LAW for how Lumin shows its work in the founder interface.  
**Companion:** `docs/constitution/LUMIN_COMMUNICATION_DNA.md` (how it *speaks*) — this file is how it *shows*.  
**Runtime surface:** `public/overlay/lifeos-app.html` (Lumin drawer) — the only active founder interface.  
**Operator lock:** Adam 2026-07-09 — watch the work happen, not just the result.

**Amendment path:** Material changes require **Article VII** / **`npm run lifeos:gate-change-run`** — not silent IDE edits that weaken visibility.

---

## One sentence (memorize)

**A live, collapsible worklog that streams the agent's reasoning and actions in real time — skimmable by default, fully expandable on demand — so you always see what it's doing, why, and where it is, without being buried in detail.**

---

## Design principle (lock this)

**Transparency by default, detail on demand.**

This is the visual twin of the honesty doctrine (§2.6 / Communication DNA): trust is earned by **showing the work**, not by asserting it. Nothing load-bearing is hidden — it may be **folded**.

---

## Four properties (non-negotiable)

| Property | Means | Anti-pattern |
|----------|--------|--------------|
| **Live, streaming, in-order** | Thoughts and actions appear as they happen, top-to-bottom | Spinner → final blob with no trail |
| **Reasoning visible** | Intent before action ("checking X because Y"); thinking ≠ doing | Only the result; silent tool use |
| **Progressive disclosure** | One-line summary skim; click expands full detail (file, command, output) | Wall of logs, or permanently hidden internals |
| **Grouped into units** | Related entries under a labeled step/task with status (in-progress / done) | Raw undifferentiated log spam |

---

## Entry kinds

| Kind | Shows | Example |
|------|--------|---------|
| `thinking` | Intent / why | "I'm going to check the last build receipt because you asked if it landed." |
| `action` | What ran | "Polling build job…", "Reading theme CSS…" |
| `observation` | What came back (folded by default) | Receipt JSON, file snippet, error |
| `result` | Terminal outcome for the chapter | PASS + SHA, or FAIL + blocker |

Default UI: chapter header + one-line per entry. Expand reveals `detail` / payload.

---

## Lifecycle in the drawer

1. User sends a message → a **worklog chapter** opens (`status: in-progress`).
2. Entries stream in order (client progress + server job `steps[]` when building).
3. Final assistant reply appears **below** the worklog (not instead of it).
4. Chapter flips to `done` / `failed` and **stays in the thread**, collapsed to a calm summary.
5. User can expand any step later — history keeps the trail.

Removing the worklog when the reply lands is a **Display DNA violation**.

---

## Honesty bound

- Worklog entries must reflect **real** progress or honest placeholders ("Waiting on Chair…") — never fake tool runs.
- Build steps come from job store / poll (`steps[]`) when available.
- Do not invent SHAs, file contents, or PASS in the worklog without a receipt (same as Communication DNA).

---

## Related

- `docs/constitution/LUMIN_COMMUNICATION_DNA.md` — voice / anti-formula / no theater
- `public/overlay/lifeos-app.html` — `.lumin-worklog` implementation
- Prior seed: live thinking panel (PR #207 lineage) — upgraded to persistent collapsible worklog

@ssot docs/products/lifeos/PRODUCT_HOME.md
