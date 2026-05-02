# LifeOS program map — canonical SSOT hub

**Purpose:** One place the **system and humans** read before changing navigation, dashboard HTML, or queue order. Stops scattered “ideas” from becoming competing truths.

**Last updated:** 2026-05-03

## No drift — and no self-deception (stricter than drift)

**North Star Article II §2.6** applies here too: we do not **lie**, **mislead**, or **pretend** — including **to ourselves**. That is worse than normal drift: it is **comforting fiction** that ships as “green.”

- **No hallucinated capabilities** in SSOT, status, or handoff (if it is not wired + proven, say **stub**, **backlog**, or **not verified**).
- **No “done”** without a receipt a cold agent can check (HTTP, commit, log, or explicit **⚠️ INCOMPLETE**).
- **No substituting** a story for evidence — use **KNOW / THINK / GUESS** on anything load-bearing (`prompts/00-LIFEOS-AGENT-CONTRACT.md`).

If a model or a human wants the pretty narrative: **the truth still wins**.

---

## Authority order (do not skip)

1. `docs/SSOT_NORTH_STAR.md` — Article II §2.11a (LifeOS consumer vs TokenOS; mockup conformance).
2. `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — scope, backlog, epistemic contract.
3. **This file** — where things live on disk and in the product shell.
4. `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` — pixel + interaction rules for dashboard work.
5. `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json` — **ordered** autonomous build queue (`tasks[]` top = next priority).

If two docs disagree on **layout or IA**, **North Star + Amendment 21 + this hub win** until Article VII amends them.

---

## Visual source of truth (mockups)

PNG boards under **`docs/mockups/`** (also listed in the Builder Brief):

| Asset | What it defines |
|--------|------------------|
| `lifeos-system-map-board-2x.png` | Whole-program map (domains / layers). |
| `lifeos-shell-dashboard-architecture-board-2x.png` | Shell + dashboard architecture (sidebar, rails, density intent). |
| `lifeos-expansion-stack-board-2x.png` | How the product expands without one giant screen. |
| `lifeos-dashboard-density-study-light-dark-mobile-desktop.png` | Density + light/dark + mobile/desktop (referenced in Brief). |

**Rule:** Builder tasks that change chrome **inject** `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` + relevant mockup names in `files[]`. Do not invent a parallel layout because a model “prefers” it.

---

## Runtime map (what exists in the browser)

| Surface | URL path | SSOT / code |
|---------|-----------|-------------|
| LifeOS app shell | `/overlay/lifeos-app.html` | `public/overlay/lifeos-app.html` |
| **Canonical one-link shell (recommended)** | **`/lifeos`** (same shell file as above; query params optional) | Short alias from `routes/public-routes.js` |
| Dashboard home | Loaded inside shell iframe (default **`lifeos-dashboard.html`**) | `public/overlay/lifeos-dashboard.html` |
| Full chat | `/overlay/lifeos-chat.html` | Linked from shell / Lumin entry points |

### One link — mobile ↔ desktop (**`layout`**)

Share **one** URL; viewport CSS picks shell chrome by default. Optional query overrides mockup testing:

- **`layout=auto`** (default): **≤599px** → mobile chrome (bottom tabs + mobile top bar); **`≥600px`** → sidebar + desktop top bar *(same behavior as omitting **`layout`**)*.
- **`layout=mobile`**: force mobile chrome at **any** width (brief: bottom tabs).
- **`layout=desktop`**: force sidebar + desktop top bar at **any** width (brief: left sidebar).

**Example (explicit dashboard + auto layout):**

`https://<your-public-host>/overlay/lifeos-app.html?page=lifeos-dashboard.html&layout=auto`  
**or** shorter: `https://<your-public-host>/lifeos?page=lifeos-dashboard.html&layout=auto`

**Defaults when `page` is omitted:** shell opens **Dashboard** first visit (sidebar / bottom tab “Home”), unless `sessionStorage` still has another last page — **`?page=`** still wins.

**Auth:** Overlays expect LifeOS API key in client storage per existing bootstrap — see overlay headers / `lifeos-bootstrap.js`.

---

## Honest gap (why this doc exists)

Early **`lifeos-dashboard.html`** work mixed **GAP-FILL**, **`/execute`** rescue, and queued **`/build`** slices. **Shipped HTML is not guaranteed to match every pixel** of the boards until the queue + brief-driven passes finish.

**Policy:** Improve by **diffing against the Brief + mockups**, then **`/build`** with injected SSOT — not by guessing a second dashboard design in chat.

---

## Next autonomous slice (queue truth)

Queue spec: **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md`**.  
Queue JSON: **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**.

**Slice selection:** `tasks[]` is **priority order**. Cursor state lives in **`data/builder-continuous-queue-cursor.*.json`** — **`nextStartIndex`** points at the next row.

**KNOW (recent operator runs):** Cursor advanced past **`dashboard-customization-state-contract`** → next rows include **`dashboard-widget-density-spec`**, **`dashboard-today-category-spec`**, **`dashboard-category-stubs-spec`**, then wave-3 specs (**`dashboard-a11y-spec`**, **`dashboard-loading-empty-spec`**). Re-read the JSON if cursor moved.

---

## Anti-drift rules

- **No second “master plan”** in random markdown — extend **this file**, Amendment 21, or the Brief; receipt the change.
- **Queue edits** must preserve Adam’s priority intent: **append** or **reorder with a Change Receipt row**, do not silently drop tasks.
- **TokenOS / API savings / Command Center** are **different programs** — do not hide them inside LifeOS nav without an explicit decision (Amendment 21 §2.11a).

---

## Related index

| Topic | Doc |
|-------|-----|
| Brainstorm / ideas catalog | `docs/BRAINSTORM_SESSIONS_IDEAS_CATALOG.md` |
| Shell gap audit | `docs/projects/DASHBOARD_SHELL_GAP_AUDIT.md` |
| Density notes | `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md` |
| AI rail contract | `docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md` |
