# Gap Audit: LifeOS Dashboard vs. Builder Brief

## Summary

**Critical finding:** The builder brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) do **not exist** in the repository. The injected file bodies returned `ENOENT` (file not found) for both paths.

Without the brief, I cannot perform a meaningful gap audit. The current production HTML files (`lifeos-dashboard.html` and `lifeos-app.html`) exist and are functional, but I have no authoritative specification to compare them against.

---

## Gaps vs. Brief

**Cannot assess** — the brief does not exist at the documented path:
- `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` → `ENOENT`
- `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md` → `ENOENT`

**What I can observe from the production HTML:**

### `lifeos-dashboard.html` (standalone dashboard page)
- **Layout:** Single-page, no sidebar, no bottom tabs
- **Sections:** Header (greeting + ambient/theme controls), MITs, Calendar, Goals, Life Scores (4 rings), Chat with Lumin
- **Voice:** Push-to-talk (Space bar), optional speak-replies toggle, ambient mode toggle in header
- **Theme:** Light/dark toggle in header
- **Mobile:** Responsive (stacks cards), no dedicated mobile chrome (no bottom nav)

### `lifeos-app.html` (full shell)
- **Layout:** Sidebar (collapsible/mini on desktop, drawer on mobile) + topbar (desktop) or mobile topbar + bottom nav (mobile)
- **Lumin:** Persistent drawer (right side desktop, bottom sheet mobile) + FAB + quick-bar strip above content
- **Voice:** Topbar button for always-on voice, drawer has push-to-talk mic
- **Theme:** Toggle in topbar, settings panel, mobile topbar
- **Mobile chrome:** Bottom nav with 4 fixed tabs (Today, Inner, Health, Healing) + "More" sheet
- **Sidebar:** Full nav tree (Daily, Life & Relationships, Support, Self, Legacy groups)

**Potential gaps (speculative, without brief):**
- If the brief called for a **unified mobile/desktop layout**, `lifeos-dashboard.html` lacks mobile bottom nav
- If the brief specified **AI rail direction** (left/right/bottom), `lifeos-app.html` uses right drawer (desktop) and bottom sheet (mobile) — no left rail
- If the brief required **sidebar in dashboard view**, `lifeos-dashboard.html` has none
- If the brief mandated **specific mockup filenames** for reference, I cannot verify alignment

---

## Recommended Next Queued Builds

**Priority 1: Restore the brief**
1. **Task:** Locate or regenerate `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`
   - **Why:** Without the brief, no gap audit or overnight queue execution is possible
   - **Action:** Check git history, ask operator for original brief, or regenerate from design intent

**Priority 2: SQL validation gate** (already approved in task list)
2. **Task:** Add SQL syntax validation to `validateGeneratedOutputForTarget` before builder commits `.sql` files
   - **Why:** Builder currently only validates `.js`/`.mjs` — SQL files bypass syntax gate
   - **File:** `services/builder.js` (or new `services/sql-validator.js`)

**Priority 3: Stale hypothesis sweep scheduler** (already approved)
3. **Task:** Wire `GET /api/v1/memory/stale-hypotheses` into `startup/register-schedulers.js`
   - **Why:** Manual sweep is error-prone; automate weekly or daily
   - **File:** `startup/register-schedulers.js`

**Priority 4: CI evidence bridge** (already approved)
4. **Task:** Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`
   - **Why:** CI results should auto-log to `evidence` table for memory system
   - **File:** `.github/workflows/smoke-test.yml`

---

## Open Questions

1. **Where is the builder brief?**
   - Was it never committed, or moved to a different path?
   - Should I generate a new brief from the existing HTML + design intent?

2. **What is the intended relationship between `lifeos-dashboard.html` and `lifeos-app.html`?**
   - Is `lifeos-dashboard.html` a **standalone entry point** (e.g., for `/dashboard` route)?
   - Or is it meant to be **loaded inside `lifeos-app.html`'s iframe** (as `content-frame` src)?

3. **Mobile layout intent:**
   - Should `lifeos-dashboard.html` have its own bottom nav, or is it always embedded in `lifeos-app.html`?
   - If standalone, does it need the same mobile chrome as the shell?

4. **AI rail direction:**
   - Brief mentioned "AI rail direction" — does this mean Lumin drawer should be **configurable** (left/right/bottom)?
   - Or is the current right-drawer (desktop) + bottom-sheet (mobile) the final design?

5. **Mockup filenames:**
   - Brief was supposed to reference mockup files — were these Figma exports, screenshots, or HTML prototypes?
   - If they exist elsewhere, provide paths for alignment check.

---

**Next step:** Operator must either:
- Provide the missing brief files, or
- Confirm that no brief exists and authorize a **reverse-engineered brief** from the production HTML, or
- Clarify the design intent so I can generate a new brief and queue.